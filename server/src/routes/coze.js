const router = require('express').Router();
const config = require('../config');
const { pool } = require('../db');
const env = require('dotenv').config();

/**
 * POST /api/coze/run
 * Body: { id: number|string, event_title: string }
 */
router.post('/coze/run', async (req, res) => {
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

    if (!env.parsed.COZE_TOKEN) {
        return res
            .status(500)
            .json({ message: '缺少 COZE_TOKEN，请先在 server/.env 中配置' });
    }
    try {
        const upstream = await fetch(config.coze.runUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.parsed.COZE_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ event_title: title }),
        });

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
        console.error('[Coze] 请求失败:', err.message);
        return res.status(502).json({
            message: '调用 Coze API 失败',
            error: err.message,
        });
    }
});

module.exports = router;