const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { pool } = require('../db');
const { uploadBufferAndGetUrl } = require('../oss');
const { synthesizeFromUrlAndText } = require('../cosyvoice');
const { askImage } = require('../qWenVLFlash');
const { callCozeMaterialMatch } = require('./coze');

const router = express.Router();

/** Remotion POST /api/render-video 单次 body 模板（字幕样式 id 在顶层 id，文案在 inputProps.TEXT1） */
const REMOTION_RENDER_BODY_TEMPLATE = {
    width: 1000,
    height: 1000,
    durationInFrames: 60,
    transparent: true,
    fps: 30,
};

function toDurationInFrames(durationSeconds) {
    const fps = REMOTION_RENDER_BODY_TEMPLATE.fps;
    const fallback = REMOTION_RENDER_BODY_TEMPLATE.durationInFrames;
    if (
        typeof durationSeconds !== 'number' ||
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0
    ) {
        return fallback;
    }
    return Math.max(1, Math.round(durationSeconds * fps));
}

function subtitlesOutputDir() {
    return path.join(__dirname, '..', '..', 'generated', 'subtitles');
}

/**
 * @param {string} subtitlesType AE 样式 id（如 guodong）
 * @param {string} text 单条字幕
 * @param {number|null|undefined} durationSeconds 当前字幕对应语音时长（秒）
 */
function buildRemotionSubtitleBody(subtitlesType, text, durationSeconds) {
    return {
        ...REMOTION_RENDER_BODY_TEMPLATE,
        durationInFrames: toDurationInFrames(durationSeconds),
        id: subtitlesType,
        inputProps: { TEXT1: text },
        useGPU: false,
    };
}

/**
 * @param {string} remotionBaseUrl 无尾斜杠
 * @param {object} body Remotion 请求体
 * @returns {Promise<{ data: Buffer, status: number }>}
 */
async function postRemotionRender(remotionBaseUrl, body) {
    const url = `${remotionBaseUrl}/api/render-video`;
    const resp = await axios.post(url, body, {
        responseType: 'arraybuffer',
        timeout: 120000,
        validateStatus: () => true,
    });
    return { data: Buffer.from(resp.data), status: resp.status };
}

function parseRemotionError(buffer) {
    try {
        const errJson = JSON.parse(buffer.toString('utf8'));
        return errJson.details || errJson.error || null;
    } catch {
        return null;
    }
}

async function getSynthAudioDurationSeconds(buf) {
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
        return undefined;
    }
    try {
        const { parseBuffer } = await import('music-metadata');
        const meta = await parseBuffer(buf, 'audio/mpeg');
        const d = meta.format.duration;
        if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
            return Math.round(d * 1000) / 1000;
        }
    } catch (e) {
        console.warn('[generate] 解析合成音频时长失败:', e.message);
    }
    return undefined;
}

function isValidVoiceUrl(url) {
    if (typeof url !== 'string' || !url.trim()) {
        return false;
    }
    return /^https?:\/\//i.test(url.trim());
}

/**
 * 一键生成语音：每条字幕文本调用一次 CosyVoice，结果上传 OSS。
 * @param {{ voice_url: string, lines: string[] }} params
 */
async function runOneClickSpeech({ voice_url, lines }) {
    const refUrl = String(voice_url || '').trim();
    const audios = [];

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        try {
            const { audio, format, voiceId } = await synthesizeFromUrlAndText(
                refUrl,
                text
            );
            const ext =
                format && typeof format === 'string'
                    ? `.${format.replace(/^\./, '')}`
                    : '.mp3';
            const synthFilename = `synth-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
            const ossObjectKey = `sound/${synthFilename}`;
            const ossUrl = await uploadBufferAndGetUrl(audio, ossObjectKey);
            const durationSeconds = await getSynthAudioDurationSeconds(audio);

            audios.push({
                index: i,
                text,
                voiceId,
                ossUrl: ossUrl || undefined,
                format: format || 'mp3',
                durationSeconds:
                    durationSeconds != null ? durationSeconds : null,
            });
        } catch (err) {
            return {
                ok: false,
                status: 502,
                message: '语音合成失败',
                index: i,
                text,
                detail: err.message || String(err),
                audios,
            };
        }
    }

    return {
        ok: true,
        voice_url: refUrl,
        count: audios.length,
        audios,
    };
}

/**
 * 一键生成字幕视频（Remotion）：每条字幕按对应语音时长 durationInFrames 渲染。
 * @param {{ subtitles_type: string, lines: string[], audios?: Array<{ durationSeconds?: number | null }> }} params
 */
async function runOneClickSubtitleVideos({ subtitles_type, lines, audios = [] }) {
    const base = config.remotionRenderUrl.replace(/\/$/, '');
    const outDir = subtitlesOutputDir();
    fs.mkdirSync(outDir, { recursive: true });

    const videos = [];
    const subtitles = lines.map((text, index) => {
        const durationSeconds = audios[index]?.durationSeconds ?? null;
        return {
            index,
            text,
            durationSeconds,
            fps: REMOTION_RENDER_BODY_TEMPLATE.fps,
            durationInFrames: toDurationInFrames(durationSeconds),
        };
    });

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        const durationSeconds = audios[i]?.durationSeconds ?? null;
        const body = buildRemotionSubtitleBody(
            subtitles_type,
            text,
            durationSeconds
        );
        const { data, status } = await postRemotionRender(base, body);
        if (status >= 400) {
            const detail = parseRemotionError(data) || String(status);
            return {
                ok: false,
                status: 502,
                message: 'Remotion 渲染失败',
                index: i,
                text,
                detail,
                videos,
                subtitles,
            };
        }
        const fileName = `sub-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.mp4`;
        const filePath = path.join(outDir, fileName);
        fs.writeFileSync(filePath, data);
        videos.push({
            index: i,
            text,
            fileName,
            url: `/api/static/generated/subtitles/${fileName}`,
        });
    }

    return {
        ok: true,
        subtitles_type,
        subtitles,
        count: videos.length,
        videos,
    };
}

function parseOneClickBody(body) {
    const b = body || {};
    const subtitles_type =
        typeof b.subtitles_type === 'string' && b.subtitles_type.trim()
            ? b.subtitles_type.trim()
            : typeof b.subtitle_type === 'string' && b.subtitle_type.trim()
              ? b.subtitle_type.trim()
              : '';

    let rawList = b.subtitles;
    if (!Array.isArray(rawList) && Array.isArray(b.subtitle_segments)) {
        rawList = b.subtitle_segments;
    }

    const voice_url =
        typeof b.voice_url === 'string' ? b.voice_url.trim() : '';

    const materialList = Array.isArray(b.materialList) ? b.materialList : [];

    return { subtitles_type, rawList, voice_url, materialList };
}

function normalizeMaterialUrls(materialList) {
    return (materialList || [])
        .map((item) => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item.url === 'string') return item.url.trim();
            if (item && typeof item.material_url === 'string') return item.material_url.trim();
            return '';
        })
        .filter(Boolean);
}

/**
 * 解析 Qwen 返回的「JSON」：模型常输出 markdown 代码块、或键未加双引号（非严格 JSON），
 * 直接 JSON.parse 会在某张图上失败（例如 SyntaxError at position 1）。
 * @param {string} answer
 * @returns {string[]}
 */
function parseTipFromQwenAnswer(answer) {
    const raw = String(answer || '').trim();
    if (!raw) return [];

    let body = raw;
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) body = fence[1].trim();

    function tryStrictJson(str) {
        try {
            const o = JSON.parse(str);
            if (Array.isArray(o) && o[0] && typeof o[0] === 'object') {
                const t = o[0].tip;
                if (Array.isArray(t)) return t;
            }
            if (o && typeof o === 'object' && !Array.isArray(o) && Array.isArray(o.tip)) {
                return o.tip;
            }
        } catch {
            /* 非严格 JSON */
        }
        return null;
    }

    let tips = tryStrictJson(body);
    if (tips !== null) return tips;

    const b0 = body.indexOf('{');
    const b1 = body.lastIndexOf('}');
    if (b0 >= 0 && b1 > b0) {
        const slice = body.slice(b0, b1 + 1);
        tips = tryStrictJson(slice);
        if (tips !== null) return tips;
        try {
            const o = new Function('return (' + slice + ')')();
            if (o && typeof o === 'object' && !Array.isArray(o) && Array.isArray(o.tip)) {
                return o.tip;
            }
        } catch {
            /* ignore */
        }
    }

    const a0 = body.indexOf('[');
    const a1 = body.lastIndexOf(']');
    if (a0 >= 0 && a1 > a0) {
        tips = tryStrictJson(body.slice(a0, a1 + 1));
        if (tips !== null) return tips;
    }

    return [];
}

/** material_tip.url_hash：对完整 URL 做 SHA-256 十六进制（64 字符） */
function hashMaterialUrl(materialUrl) {
    return crypto.createHash('sha256').update(String(materialUrl), 'utf8').digest('hex');
}

/** tip 存 varchar(1000)，用 JSON 数组字符串 */
function tipArrayToDbColumn(tip) {
    const s = JSON.stringify(Array.isArray(tip) ? tip : []);
    return s.length > 1000 ? s.slice(0, 1000) : s;
}

/**
 * 写入或更新 material_tip（先按 material_url 更新，无行则插入）
 * @param {import('mysql2/promise').Pool} dbPool
 */
async function upsertMaterialTipRow(dbPool, materialUrl, tipArr) {
    const urlHash = hashMaterialUrl(materialUrl);
    const tipCol = tipArrayToDbColumn(tipArr);
    const [upd] = await dbPool.query(
        'UPDATE material_tip SET tip = ?, url_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE material_url = ?',
        [tipCol, urlHash, materialUrl]
    );
    if (upd.affectedRows > 0) return;
    await dbPool.query(
        'INSERT INTO material_tip (material_url, url_hash, tip, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [materialUrl, urlHash, tipCol]
    );
}

const MATERIAL_VL_TAG_PROMPT =
    "帮我对你收到的这张图片打标，输出 json 格式为 {tip: []}，tip 为标签数组例如 ['清晨', '太阳']，只针对当前这一张图。";

/**
 * 素材列表：查库已有标签、对未命中 URL 调用 Qwen VL 打标并写入 material_tip。
 * @param {import('mysql2/promise').Pool} dbPool
 * @param {unknown[]} materialList parseOneClickBody 中的 materialList
 * @returns {Promise<{ materialTips: object[], stats: { total: number, fromDb: number, calledQwenVlFlash: number } } | null>}
 *   无有效素材 URL 时返回 null
 */
async function processMaterialListTips(dbPool, materialList) {
    const materialUrls = normalizeMaterialUrls(materialList);
    if (materialUrls.length === 0) return null;

    const uniqueUrls = [...new Set(materialUrls)];
    const [rows] = await dbPool.query(
        'SELECT material_url, tip FROM material_tip WHERE material_url IN (?)',
        [uniqueUrls]
    );
    const existingMap = new Map(
        (rows || []).map((r) => [
            String(r.material_url),
            {
                material_url: r.material_url,
                tip: r.tip ?? null,
            },
        ])
    );
    const images = uniqueUrls.filter((url) => !existingMap.has(url));

    const generated = [];
    if (images.length > 0) {
        const out = await askImage({ images, prompt: MATERIAL_VL_TAG_PROMPT });
        for (const item of out.results || []) {
            const tip = parseTipFromQwenAnswer(item.answer);
            await upsertMaterialTipRow(dbPool, item.image, tip);
            generated.push({
                material_url: item.image,
                tip,
                source: 'qwen-vl-flash',
            });
        }
    }

    return {
        materialTips: [...existingMap.values(), ...generated],
        stats: {
            total: uniqueUrls.length,
            fromDb: existingMap.size,
            calledQwenVlFlash: images.length,
        },
    };
}

/**
 * 处理一键生成中的语音阶段：参数校验 + 文本归一化 + 调用 CosyVoice。
 * @param {{ rawList: unknown, voice_url: string }} params
 */
async function processOneClickSpeechStage({ rawList, voice_url }) {
    if (!Array.isArray(rawList)) {
        return {
            ok: false,
            status: 400,
            body: {
                success: false,
                stage: 'speech',
                message: '缺少字幕列表：subtitles 或 subtitle_segments（须为字符串数组）',
            },
        };
    }

    const lines = rawList
        .map((s) => (s == null ? '' : String(s).trim()))
        .filter(Boolean);

    if (lines.length === 0) {
        return {
            ok: false,
            status: 400,
            body: {
                success: false,
                stage: 'speech',
                message: '字幕列表无有效条目',
            },
        };
    }

    if (!isValidVoiceUrl(voice_url)) {
        return {
            ok: false,
            status: 400,
            body: {
                success: false,
                stage: 'speech',
                message: '缺少有效的 voice_url（参考音公网 HTTPS/HTTP 地址）',
            },
        };
    }

    const speechResult = await runOneClickSpeech({
        voice_url,
        lines,
    });

    if (!speechResult.ok) {
        return {
            ok: false,
            status: speechResult.status,
            body: {
                success: false,
                stage: 'speech',
                message: speechResult.message,
                index: speechResult.index,
                text: speechResult.text,
                detail: speechResult.detail,
                audios: speechResult.audios,
            },
        };
    }

    return {
        ok: true,
        lines,
        speechResult,
    };
}

/**
 * 处理一键生成中的字幕视频阶段：按 subtitles_type 决定是否渲染视频。
 * @param {{ subtitles_type: string, lines: string[], speechResult: { audios: any[] } }} params
 */
async function processOneClickSubtitleStage({
    subtitles_type,
    lines,
    speechResult,
}) {
    let videos = [];
    let subtitles = [];
    if (!subtitles_type) {
        return { ok: true, videos, subtitles };
    }

    const videoResult = await runOneClickSubtitleVideos({
        subtitles_type,
        lines,
        audios: speechResult.audios,
    });
    if (!videoResult.ok) {
        return {
            ok: false,
            status: videoResult.status,
            body: {
                success: false,
                stage: 'subtitle',
                message: videoResult.message,
                index: videoResult.index,
                text: videoResult.text,
                detail: videoResult.detail,
                videos: videoResult.videos,
                subtitles: videoResult.subtitles,
                audios: speechResult.audios,
            },
        };
    }
    videos = videoResult.videos;
    subtitles = videoResult.subtitles;
    return { ok: true, videos, subtitles };
}

/**
 * POST /api/generate
 * POST /api/generate/subtitles
 */
async function handleOneClickGenerate(req, res) {
    const { subtitles_type, rawList, voice_url, materialList } = parseOneClickBody(req.body);

    let materialResult = null;
    try {
        // 处理素材打标阶段
        materialResult = await processMaterialListTips(pool, materialList);
        
    } catch (err) {
        console.error('[generate materialList test]', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'materialList 打标试验失败',
        });
    }

    try {
        // 处理语音阶段
        const speechStage = await processOneClickSpeechStage({
            rawList,
            voice_url,
        });
        if (!speechStage.ok) {
            console.error(
                '[generate] speech stage failed',
                speechStage.status,
                speechStage.body?.message,
                speechStage.body?.detail || ''
            );
            return res.status(speechStage.status).json(speechStage.body);
        }

        // 处理字幕视频阶段
        // const subtitleStage = await processOneClickSubtitleStage({
        //     subtitles_type,
        //     lines: speechStage.lines,
        //     speechResult: speechStage.speechResult,
        // });
        // if (!subtitleStage.ok) {
        //     console.error(
        //         '[generate] subtitle stage failed',
        //         subtitleStage.status,
        //         subtitleStage.body?.message,
        //         subtitleStage.body?.detail || ''
        //     );
        //     return res.status(subtitleStage.status).json(subtitleStage.body);
        // }

        // 返回结果
        let materialMatch = null;
        if (
            Array.isArray(speechStage.speechResult.audios) &&
            speechStage.speechResult.audios.length > 0 &&
            materialResult &&
            Array.isArray(materialResult.materialTips) &&
            materialResult.materialTips.length > 0
        ) {
            try {
                const matchResp = await callCozeMaterialMatch({
                    voice_data: speechStage.speechResult.audios,
                    image_data: materialResult.materialTips,
                });
                materialMatch = {
                    status: matchResp.status,
                    contentType: matchResp.contentType || undefined,
                    body: matchResp.bodyText,
                };
            } catch (err) {
                console.error('[generate] material-match failed', err.message);
                materialMatch = {
                    status: 502,
                    error: err.message || String(err),
                };
            }
        }

        return res.json({
            success: true,
            message: materialResult ? '素材打标 + 语音字幕生成完成' : '语音字幕生成完成',
            materialTips: materialResult ? materialResult.materialTips : undefined,
            stats: materialResult ? materialResult.stats : undefined,
            voice_url: speechStage.speechResult.voice_url,
            subtitles_type: subtitles_type || undefined,
            count: speechStage.speechResult.count,
            audios: speechStage.speechResult.audios,
            subtitles: null,
            videos: [],
            material_match: materialMatch,
        });
    } catch (err) {
        console.error('[generate one-click]', err);
        const msg =
            err.message && err.message !== '[object Object]'
                ? err.message
                : '生成失败';
        return res.status(500).json({ success: false, message: msg });
    }
}

router.post('/generate', handleOneClickGenerate);
router.post('/generate/subtitles', handleOneClickGenerate);

module.exports = router;
module.exports.buildRemotionSubtitleBody = buildRemotionSubtitleBody;
module.exports.runOneClickSubtitleVideos = runOneClickSubtitleVideos;
module.exports.runOneClickSpeech = runOneClickSpeech;
module.exports.isValidVoiceUrl = isValidVoiceUrl;
