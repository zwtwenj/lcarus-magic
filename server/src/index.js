const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { expressjwt: expressJwt } = require('express-jwt');
const config = require('./config');
const { pool } = require('./db');
const authRoutes = require('./routes/auth');
const hotspotRoutes = require('./routes/hotspot');
const cozeRoutes = require('./routes/coze');
const soundRoutes = require('./routes/sound');
const subtitlesRoutes = require('./routes/subtitles');
const generateRoutes = require('./routes/generate');
const qwenVLRoutes = require('./routes/qwenVL');
const qWenVLFlashRoutes = require('./routes/qWenVLFlash');
const path = require('path');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const generatedSubtitlesDir = path.join(__dirname, '..', 'generated', 'subtitles');
app.use(
    '/api/static/generated/subtitles',
    express.static(generatedSubtitlesDir)
);

// JWT 鏍￠獙锛氶櫎 /api/auth 澶栧潎闇€鏈夋晥 token
app.use(
    '/api',
    expressJwt({
        secret: config.jwtSecret,
        algorithms: ['HS256'],
    }).unless({
        path: [
            '/api/auth/login',
            '/api/coze/run',
            '/api/hotspot',
            '/api/hotspot/refresh',
            '/api/hotspot/detail',
            '/api/sound/enroll',
            '/api/qwen-vl/tag',
            '/api/qwen-vl-flash/ask',
            '/api/generate',
            '/api/generate/subtitles',
        ],
    })
);

app.use('/api/auth', authRoutes);
app.use('/api', hotspotRoutes);
app.use('/api', cozeRoutes);
app.use('/api', soundRoutes);
app.use('/api', subtitlesRoutes);
app.use('/api', generateRoutes);
app.use('/api', qwenVLRoutes);
app.use('/api', qWenVLFlashRoutes);

// Handle errors for JWT validation
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: 'Invalid token' });
    }
    next(err);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
});

app.listen(config.port, async () => {
    console.log(`Server is running on http://localhost:${config.port}`);
    try {
        await pool.query('SELECT 1');
        const cfg = pool.pool?.config?.connectionConfig;
        if (cfg) {
            console.log(
                `[db] MySQL 已连通 ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`
            );
        } else {
            console.log('[db] MySQL 已连通（连接信息见 src/db.js）');
        }
    } catch (err) {
        console.error('[db] MySQL 连接失败:', err.message);
        console.error('[db] 当前连接配置见 server/src/db.js（若使用硬编码明码）');
        console.error(
            '[db] 若报错含 \'@\' 某公网 IP：远端已收到连接，需在 MySQL 上为该出口 IP 授权。'
        );
    }
});
