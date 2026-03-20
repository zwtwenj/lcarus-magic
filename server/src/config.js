const path = require('path');

// 始终从 server 目录加载环境变量，避免从仓库根目录启动时读不到 server/.env
const serverRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(serverRoot, '.env') });
// 未创建 .env 时可用 .env.example 中的 MYSQL_* 等（.env 里同名变量优先，不会被覆盖）
require('dotenv').config({ path: path.join(serverRoot, '.env.example') });

module.exports = {
  port: process.env.PORT || 9400,
  jwtSecret: process.env.JWT_SECRET || 'default-dev-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  /** 热点数据上游（GET ?date=YYYYMMDD） */
  hotspotUpstreamUrl:
    process.env.HOTSPOT_UPSTREAM_URL || 'http://47.110.47.101:9400',
  mysql: {
    host: process.env.MYSQL_ADDRESS || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_NAME || 'lcarus-magic',
  },
};
