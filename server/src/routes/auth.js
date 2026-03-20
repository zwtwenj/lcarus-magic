const router = require('express').Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../db');

/**
 * POST /api/auth/login
 * Body: { account: string, password: string }
 * account 与 users.account
 */
router.post('/login', async (req, res) => {
    const { account, password } = req.body || {};
    if (account === undefined || account === null || password === undefined || password === null) {
        return res.status(400).json({ message: '请提供 account 和 password' });
    }
    const acc = String(account).trim();
    const pwd = String(password);
    if (!acc || !pwd) {
        return res.status(400).json({ message: 'account 与 password 不能为空' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id, account, email, password_hash, display_name, role, status
       FROM users
       WHERE status = 1 AND (account = ? OR email = ?)
       LIMIT 1`,
            [acc, acc]
        );
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ message: '账号或密码错误' });
        }

        const match = pwd === String(user.password_hash ?? '');
        if (!match) {
            return res.status(401).json({ message: '账号或密码错误' });
        }

        const token = jwt.sign(
            {
                sub: String(user.id),
                account: user.account,
                role: user.role,
            },
            config.jwtSecret,
            { algorithm: 'HS256', expiresIn: '7d' }
        );

        await pool.query('UPDATE users SET last_login_at = NOW(3) WHERE id = ?', [
            user.id,
        ]);

        res.json({
            token,
            account: user.account,
            displayName: user.display_name,
            role: user.role,
        });
    } catch (err) {
        console.error('[auth/login]', err);
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ message: '用户表未初始化，请执行 sql/users.sql' });
        }
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                message:
                    'users 表字段与接口不一致：需要 account、email、password_hash 等列，请对照 sql/users.sql',
            });
        }
        res.status(500).json({ message: '登录失败，请稍后重试' });
    }
});

module.exports = router;
