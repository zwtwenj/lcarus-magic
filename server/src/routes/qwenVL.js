const router = require('express').Router();
const { tagImage, DEFAULT_TAG_PROMPT } = require('../lib/qwenVL');

function normalizeImageUrls(body) {
    const b = body || {};
    let list = [];
    if (Array.isArray(b.images)) {
        list = b.images;
    } else if (Array.isArray(b.urls)) {
        list = b.urls;
    } else if (typeof b.image === 'string') {
        list = [b.image];
    } else if (typeof b.url === 'string') {
        list = [b.url];
    }
    return list.map((v) => String(v || '').trim()).filter(Boolean);
}

/**
 * POST /api/qwen-vl/tag
 * body:
 * {
 *   "images": ["https://...jpg", "https://...png"], // 或 urls / image / url
 *   "prompt": "可选，自定义打标提示词"
 * }
 */
router.post('/qwen-vl/tag', async (req, res) => {
    const apiKey = process.env.ali_key;
    if (!apiKey || !String(apiKey).trim()) {
        return res.status(500).json({
            message: '服务端未配置 ali_key，无法调用 Qwen-VL',
        });
    }

    const images = normalizeImageUrls(req.body);
    if (!images.length) {
        return res.status(400).json({
            message: '请提供图片 URL：images（数组）或 image（字符串）',
        });
    }

    const prompt =
        typeof req.body?.prompt === 'string' && req.body.prompt.trim()
            ? req.body.prompt.trim()
            : DEFAULT_TAG_PROMPT;

    const results = [];
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
            const out = await tagImage({ image, prompt, apiKey });
            results.push({
                index: i,
                image,
                text: out.text,
                tags: out.tags,
                success: true,
            });
        } catch (e) {
            results.push({
                index: i,
                image,
                success: false,
                error: e.message || '打标失败',
            });
        }
    }

    const successCount = results.filter((r) => r.success).length;
    res.status(successCount > 0 ? 200 : 502).json({
        success: successCount > 0,
        total: results.length,
        successCount,
        failedCount: results.length - successCount,
        prompt,
        results,
    });
});

module.exports = router;

