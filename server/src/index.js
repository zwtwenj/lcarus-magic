const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { expressjwt: expressJwt } = require('express-jwt');
const config = require('./config');
const authRoutes = require('./routes/auth');
const hotspotRoutes = require('./routes/hotspot');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// JWT 校验：除 /api/auth 外均需有效 token
app.use(
    '/api',
    expressJwt({
        secret: config.jwtSecret,
        algorithms: ['HS256'],
    }).unless({
        path: ['/api/auth/login', '/api/hotspot'],
    })
);

app.use('/api/auth', authRoutes);
app.use('/api', hotspotRoutes);

// 错误处理：JWT 未通过时
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: '无效或过期的 token' });
    }
    next(err);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: '服务器内部错误' });
});

app.listen(config.port, () => {
    console.log(`服务已启动: http://localhost:${config.port}`);
});
