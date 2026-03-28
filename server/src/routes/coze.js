const router = require('express').Router();
const config = require('../config');
const { pool } = require('../db');

function getCozeToken(kind) {
    if (kind === 'event-detail') {
        return String(process.env.COZE_EVENT_DETAIL_TOKEN || '').trim();
    }
    if (kind === 'material-match') {
        return String(process.env.COZE_MATERIAL_MATCH_TOKEN || '').trim();
    }
    if (kind === 'ffmpeg') {
        return String(process.env.COZE_FFMPEG_Token || '').trim();
    }
    return '';
}

async function postCozeWorkflow(url, payload, token) {
    return fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload || {}),
    });
}

/**
 * 调用 Coze 素材匹配工作流
 * @param {{ voice_data: unknown[], image_data: unknown[] }} payload
 * @returns {Promise<{ status: number, contentType: string, bodyText: string }>}
 */
async function callCozeMaterialMatch({ voice_data, image_data }) {
    if (!Array.isArray(voice_data) || voice_data.length === 0) {
        throw new Error('voice_data 必填，且必须为非空数组');
    }
    if (!Array.isArray(image_data) || image_data.length === 0) {
        throw new Error('image_data 必填，且必须为非空数组');
    }
    const token = getCozeToken('material-match');
    if (!token) {
        throw new Error(
            '缺少 COZE_MATERIAL_MATCH_TOKEN，请先在 server/.env 中配置'
        );
    }

    const upstream = await postCozeWorkflow(
        config.coze.materialMatchUrl,
        { voice_data, image_data },
        token
    );
    const contentType = upstream.headers.get('content-type') || '';
    const bodyText = await upstream.text();
    return {
        status: upstream.status,
        contentType,
        bodyText,
    };
}

/**
 * 调用 Coze「生成 ffmpeg 命令」等工作流（请求体为 { json_input: object }）
 * @param {Record<string, unknown>} jsonInput 与示例 JSON.stringify({"json_input": {}}) 中内层对象对应
 * @returns {Promise<{ status: number, contentType: string, bodyText: string }>}
 */
async function callCozeFfmpegCommand(jsonInput) {
    if (
        jsonInput == null ||
        typeof jsonInput !== 'object' ||
        Array.isArray(jsonInput)
    ) {
        throw new Error('json_input 须为普通对象');
    }
    const token = getCozeToken('ffmpeg');
    if (!token) {
        throw new Error('缺少 COZE_FFMPEG_Token，请先在 server/.env 中配置');
    }

    const upstream = await postCozeWorkflow(
        config.coze.ffmpegRunUrl,
        { json_input: jsonInput },
        token
    );
    const contentType = upstream.headers.get('content-type') || '';
    const bodyText = await upstream.text();
    return {
        status: upstream.status,
        contentType,
        bodyText,
    };
}

/**
 * 事件详情工作流（原 /api/coze/run 功能）
 * POST /api/coze/event-detail
 * Body: { id: number|string, event_title: string }
 */
async function handleCozeEventDetail(req, res) {
    const { id, event_title } = req.body || {};
    const rawId = String(id ?? '').trim();
    if (!/^\d+$/.test(rawId)) {
        return res.status(400).json({ message: '请提供有效的 id（正整数）' });
    }
    const hotId = Number(rawId);

    const title = String(event_title ?? '').trim();
    if (!title) {
        return res.status(400).json({ message: '请提供 event_title' });
    }

    const token = getCozeToken('event-detail');
    if (!token) {
        return res
            .status(500)
            .json({
                message:
                    '缺少 COZE_EVENT_DETAIL_TOKEN，请先在 server/.env 中配置',
            });
    }

    try {
        const upstream = await postCozeWorkflow(
            config.coze.runUrl,
            { event_title: title },
            token
        );
        const contentType = upstream.headers.get('content-type') || '';
        const bodyText = await upstream.text();

        if (upstream.ok) {
            const [result] = await pool.query(
                'UPDATE `hot-data` SET `coze_text` = ? WHERE `id` = ?',
                [bodyText, hotId]
            );
            if (result.affectedRows === 0) {
                return res
                    .status(404)
                    .json({ message: '未找到对应热点 id，无法写入 coze_text' });
            }
        }

        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        return res.status(upstream.status).send(bodyText);
    } catch (err) {
        console.error('[Coze:event-detail] 请求失败:', err.message);
        return res.status(502).json({
            message: '调用 Coze 事件详情工作流失败',
            error: err.message,
        });
    }
}

router.post('/coze/event-detail', handleCozeEventDetail);

/**
 * 配音-素材匹配工作流（新接口）
 * POST /api/coze/material-match
 * Body: { voice_data: object[], image_data: object[] }
 */
router.post('/coze/material-match', async (req, res) => {
    const { voice_data, image_data } = req.body || {};
    try {
        const { status, contentType, bodyText } = await callCozeMaterialMatch({
            voice_data,
            image_data,
        });
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        return res.status(status).send(bodyText);
    } catch (err) {
        if (
            err.message === 'voice_data 必填，且必须为非空数组' ||
            err.message === 'image_data 必填，且必须为非空数组'
        ) {
            return res.status(400).json({ message: err.message });
        }
        if (
            err.message ===
            '缺少 COZE_MATERIAL_MATCH_TOKEN，请先在 server/.env 中配置'
        ) {
            return res.status(500).json({ message: err.message });
        }
        console.error('[Coze:material-match] 请求失败:', err.message);
        return res.status(502).json({
            message: '调用 Coze 素材匹配工作流失败',
            error: err.message,
        });
    }
});

/**
 * FFmpeg 命令生成（Coze 工作流）
 * POST /api/coze/ffmpeg-command
 * Body: { json_input: object }，与上游 JSON.stringify({ json_input: {} }) 一致
 */
router.post('/coze/ffmpeg-command', async (req, res) => {
    const jsonInput = (req.body || {}).json_input;
    if (
        jsonInput == null ||
        typeof jsonInput !== 'object' ||
        Array.isArray(jsonInput)
    ) {
        return res.status(400).json({
            message: 'body 须包含普通对象字段 json_input',
        });
    }
    try {
        const { status, contentType, bodyText } =
            await callCozeFfmpegCommand(jsonInput);
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        return res.status(status).send(bodyText);
    } catch (err) {
        if (err.message === 'json_input 须为普通对象') {
            return res.status(400).json({ message: err.message });
        }
        if (
            err.message === '缺少 COZE_FFMPEG_Token，请先在 server/.env 中配置'
        ) {
            return res.status(500).json({ message: err.message });
        }
        console.error('[Coze:ffmpeg-command] 请求失败:', err.message);
        return res.status(502).json({
            message: '调用 Coze ffmpeg 工作流失败',
            error: err.message,
        });
    }
});

module.exports = router;
module.exports.callCozeMaterialMatch = callCozeMaterialMatch;
module.exports.callCozeFfmpegCommand = callCozeFfmpegCommand;