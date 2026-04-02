const router = require('express').Router();
const {
    resolveDateParam,
    fetchHotspotFromUpstream,
} = require('../lib/hotspotUpstream');
const {
    getHotDataById,
    getHotDataForDate,
    saveHotDataForDate,
    replaceHotDataForDate,
} = require('../lib/hotspotRepo');

function looksLikeJson(ct) {
    return (ct || '').toLowerCase().includes('application/json');
}

async function fetchUpstreamAndPersist(date, mode = 'append') {
    const { status, contentType, body } = await fetchHotspotFromUpstream(date);
    if (status !== 200 || !looksLikeJson(contentType)) {
        return { status, contentType, body };
    }

    const text = body.toString('utf8');
    // 尝试直接解析JSON
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (parseError) {
        // 如果直接解析失败，尝试移除反引号后再解析
        let sanitizedText = text.replace(/`/g, '');
        try {
            parsed = JSON.parse(sanitizedText);
        } catch (secondError) {
            throw secondError;
        }
    }
    if (!Array.isArray(parsed)) {
        throw new Error('上游返回 JSON 非数组，无法写入热点表');
    }

    if (mode === 'replace') {
        await replaceHotDataForDate(date, parsed);
    } else {
        await saveHotDataForDate(date, parsed);
    }

    const latest = await getHotDataForDate(date);
    return {
        status,
        contentType: 'application/json; charset=utf-8',
        body: Buffer.from(JSON.stringify(latest)),
    };
}

/**
 * GET /api/hotspot?date=YYYYMMDD
 * 先查库：若 `hot-data` 已有当日数据则直接返回；
 * 若无数据，再请求上游 HOTSPOT_UPSTREAM_URL/?date=...，写库后返回。
 */
router.get('/hotspot', async (req, res) => {
    const resolved = resolveDateParam(req.query.date);
    if (!resolved.ok) {
        return res.status(400).json({ message: resolved.message });
    }

    try {
        const existing = await getHotDataForDate(resolved.date);
        if (existing.length > 0) {
            return res.status(200).json(existing);
        }
    } catch (err) {
        console.error('[Hotspot] 查询数据库失败:', err.message);
        return res.status(500).json({ message: '查询热点缓存失败' });
    }

    try {
        const { status, contentType, body } = await fetchUpstreamAndPersist(
            resolved.date,
            'append'
        );

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
 * GET /api/hotspot/refresh?date=YYYYMMDD
 * 强制回源刷新：每次都请求上游，并用新数据覆盖该日期旧数据（先删后插）。
 */
router.get('/hotspot/refresh', async (req, res) => {
    const resolved = resolveDateParam(req.query.date);
    if (!resolved.ok) {
        return res.status(400).json({ message: resolved.message });
    }

    try {
        const { status, contentType, body } = await fetchUpstreamAndPersist(
            resolved.date,
            'replace'
        );
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        return res.status(status).send(body);
    } catch (err) {
        console.error('[Hotspot] 强制刷新失败:', err.message);
        const aborted = err.name === 'AbortError';
        return res.status(502).json({
            message: aborted ? '上游请求超时' : '强制刷新热点数据失败',
            error: err.message,
        });
    }
});

/**
 * GET /api/hotspot/detail?id=123
 * 按 id 查询单条热点数据
 */
router.get('/hotspot/detail', async (req, res) => {
    const rawId = String(req.query.id ?? '').trim();
    if (!/^\d+$/.test(rawId)) {
        return res.status(400).json({ message: 'id 必须是正整数' });
    }
    const id = Number(rawId);
    try {
        const item = await getHotDataById(id);
        if (!item) {
            return res.status(404).json({ message: '热点数据不存在' });
        }
        return res.status(200).json(item);
    } catch (err) {
        console.error('[Hotspot] 按 id 查询失败:', err.message);
        return res.status(500).json({ message: '查询热点详情失败' });
    }
});

// /**
//  * POST /api/hotspot
//  * 接收客户端上报的热点数据（需 JWT，除非在 index 里对 /api/hotspot 整段放行）
//  */
// router.post('/hotspot', async (req, res) => {
//     const body = req.body;
//     if (!body || typeof body !== 'object') {
//         return res.status(400).json({ message: '请提供有效的 JSON 热点数据' });
//     }

//     const received = {
//         events: body.events ?? [],
//         deviceId: body.deviceId ?? null,
//         sessionId: body.sessionId ?? null,
//         extra: body.extra ?? {},
//         receivedAt: new Date().toISOString(),
//         userId: req.auth?.sub ?? null,
//     };

//     console.log('[Hotspot] 收到数据:', JSON.stringify(received, null, 2));

//     res.status(200).json({
//         success: true,
//         message: '热点数据已接收',
//         received: {
//             eventCount: received.events.length,
//             receivedAt: received.receivedAt,
//         },
//     });
// });

module.exports = router;
