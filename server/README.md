# lcarus-magic

Node 后端：Express + express-jwt，提供登录与热点数据上报接口。

## 依赖

- **express** - Web 框架
- **express-jwt** - JWT 校验中间件
- **jsonwebtoken** - 签发 JWT（登录用）
- **cors** - 跨域
- **helmet** - 安全头
- **dotenv** - 环境变量

## 快速开始

```bash
# 复制环境变量并修改 JWT_SECRET
cp .env.example .env

# 启动（生产）
npm start

# 开发（文件变更自动重启）
npm run dev
```

默认端口：`3000`，可在 `.env` 中设置 `PORT`。

## 接口说明

### 1. 登录（获取 JWT）

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "任意",
  "password": "任意"
}
```

响应示例：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "任意"
}
```

### 2. 上报热点数据（需 JWT）

请求头需带：`Authorization: Bearer <token>`

```http
POST /api/hotspot
Content-Type: application/json
Authorization: Bearer <你的token>

{
  "events": [
    { "type": "click", "target": "button#submit", "timestamp": 1710000000000 }
  ],
  "deviceId": "device-xxx",
  "sessionId": "session-xxx",
  "extra": {}
}
```

响应示例：

```json
{
  "success": true,
  "message": "热点数据已接收",
  "received": {
    "eventCount": 1,
    "receivedAt": "2025-03-19T12:00:00.000Z"
  }
}
```

## 客户端调用示例

```javascript
// 1. 登录拿 token
const loginRes = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user1', password: 'pass1' }),
});
const { token } = await loginRes.json();

// 2. 上报热点数据
await fetch('http://localhost:3000/api/hotspot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    events: [{ type: 'click', target: 'button', timestamp: Date.now() }],
    deviceId: 'web-001',
    sessionId: 'sess-001',
  }),
});
```

## 项目结构

```
src/
  index.js      # 入口、中间件、路由挂载
  config.js     # 从 .env 读取配置
  routes/
    auth.js     # 登录
    hotspot.js  # 热点数据接收
```
