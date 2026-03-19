const router = require('express').Router();

/**
 * POST /api/hotspot
 * 接收客户端上报的热点数据
 * Body 示例: { events: [...], deviceId?, sessionId?, ... }
 */
router.post('/hotspot', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ message: '请提供有效的 JSON 热点数据' });
    }

    // 可在此做校验、落库、转发队列等
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
