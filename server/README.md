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

### 数据库：热点表 `hot-data`

`GET /api/hotspot` 在上游返回 **JSON 数组** 且状态码 200 时，会按请求中的 `date`（`YYYYMMDD`）写入表 **`hot-data`**（先删除该 `time` 下旧数据再插入，便于同一天重复拉取幂等）。

建表脚本：

```bash
# 在 server 目录执行；-p 后可直接跟密码，或仅 -p 交互输入
mysql -h 127.0.0.1 -P 3306 -u root -p lcarus-magic < sql/hot-data.sql
```

字段：`time`（CHAR8，即用户传入的日期）、`title`、`summary`、`material`（JSON 数组）、`remake`、`source`（JSON 数组）、`created_at`。

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

### 2. 获取热点数据（无需 JWT）

服务端会请求上游 `HOTSPOT_UPSTREAM_URL/?date=YYYYMMDD`（默认 `http://47.110.47.101:9400`），并把上游响应原样返回；若响应为 JSON 数组，会同步落库到 **`hot-data`** 表（`time` = 本次请求的日期）。

- **date**：可选，格式 `YYYYMMDD`；不传则使用**服务器当天**日期。

```http
GET /api/hotspot?date=20260320
```

```http
GET /api/hotspot
```

### 3. 上报热点数据（需 JWT，当前路由默认关闭）

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

// 2. 获取热点（示例）
const hotRes = await fetch('http://localhost:9400/api/hotspot?date=20260320');
const hotBody = await hotRes.text(); // 或 .json()，取决于上游 Content-Type

// 3. 上报热点数据
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
  db.js         # MySQL 连接池
  hotspotUpstream.js
  hotspotRepo.js
  routes/
    auth.js     # 登录
    hotspot.js  # 热点：拉取上游并可选落库
sql/
  hot-data.sql  # 表 `hot-data` 建表语句
```
