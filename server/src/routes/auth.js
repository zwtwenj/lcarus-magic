const router = require('express').Router();
const jwt = require('jsonwebtoken');
const config = require('../config');

// 简单演示：用固定账号换取 token（实际项目应查数据库并校验密码）
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: '请提供 username 和 password' });
  }
  // 演示用：任意账号密码都通过，仅生成 token
  const token = jwt.sign(
    { sub: username },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
  res.json({ token, username });
});

module.exports = router;
