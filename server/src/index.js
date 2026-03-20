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

// JWT 鏍￠獙锛氶櫎 /api/auth 澶栧潎闇€鏈夋晥 token
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
});
