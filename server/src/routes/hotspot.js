const router = require('express').Router();
const {
    resolveDateParam,
    fetchHotspotFromUpstream,
} = require('../hotspotUpstream');
const { replaceHotDataForDate } = require('../hotspotRepo');

function looksLikeJson(ct) {
    return (ct || '').toLowerCase().includes('application/json');
}

/**
 * GET /api/hotspot?date=YYYYMMDD
 * 请求上游 HOTSPOT_UPSTREAM_URL/?date=...，响应原样返回；
 * 若上游为 JSON 数组且状态 200，写入表 `hot-data`（time = 本次 date）。
 */
router.get('/hotspot', async (req, res) => {
    const resolved = resolveDateParam(req.query.date);
    if (!resolved.ok) {
        return res.status(400).json({ message: resolved.message });
    }
    try {
        const { status, contentType, body } = await fetchHotspotFromUpstream(
            resolved.date
        );

        if (status === 200 && looksLikeJson(contentType)) {
            try {
                const text = body.toString('utf8');
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    await replaceHotDataForDate(resolved.date, parsed);
                } else {
                    console.warn('[Hotspot] 上游 JSON 非数组，跳过写入 `hot-data`');
                }
            } catch (e) {
                console.error('[Hotspot] 解析或写入数据库失败:', e.message);
            }
        }

        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        return res.status(status).send(body);
    } catch (err) {
        console.error('[Hotspot] 上游获取失败:', err.message);
        const aborted = err.name === 'AbortError';
        return res.status(502).json({
            message: aborted ? '上游请求超时' : '获取热点数据失败',
            error: err.message,
        });
    }
});

/**
 * POST /api/hotspot
 * 接收客户端上报的热点数据（需 JWT，除非在 index 里对 /api/hotspot 整段放行）
 */
router.post('/hotspot', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ message: '请提供有效的 JSON 热点数据' });
    }

    const received = {
        events: body.events ?? [],
        deviceId: body.deviceId ?? null,
        sessionId: body.sessionId ?? null,
        extra: body.extra ?? {},
        receivedAt: new Date().toISOString(),
        userId: req.auth?.sub ?? null,
    };

    console.log('[Hotspot] 收到数据:', JSON.stringify(received, null, 2));

    res.status(200).json({
        success: true,
        message: '热点数据已接收',
        received: {
            eventCount: received.events.length,
            receivedAt: received.receivedAt,
        },
    });
});

module.exports = router;
