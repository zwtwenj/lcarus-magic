const path = require('path');

// 始终从 server 目录加载，避免从仓库根目录启动时读不到文件
const serverRoot = path.join(__dirname, '..');
// 先加载示例，再用 .env 整表覆盖：保证「你在 .env 里写的值」一定生效，
// 避免旧顺序下 .env 里出现 MYSQL_PASSWORD= 空行时，占位符无法补全等问题。
require('dotenv').config({ path: path.join(serverRoot, '.env.example') });
require('dotenv').config({ path: path.join(serverRoot, '.env'), override: true });

const mysql = {
    host: process.env.MYSQL_ADDRESS || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_NAME || 'lcarus-magic',
};

if (!mysql.password) {
    console.warn(
        '[config] MYSQL_PASSWORD 为空：请在 server/.env 填写数据库密码（与改 env 前硬编码一致）'
    );
} else if (mysql.password === 'your-mysql-password') {
    console.warn(
        '[config] MYSQL_PASSWORD 仍为占位符 your-mysql-password：请改为真实密码'
    );
}

module.exports = {
    port: process.env.PORT || 9400,
    jwtSecret: process.env.JWT_SECRET || 'default-dev-secret',
    nodeEnv: process.env.NODE_ENV || 'development',
    /** 热点数据上游（GET ?date=YYYYMMDD） */
    hotspotUpstreamUrl:
        process.env.HOTSPOT_UPSTREAM_URL || 'http://47.110.47.101:9400',
    coze: {
        runUrl: process.env.COZE_RUN_URL || 'https://ns8v3cbwzq.coze.site/run',
    },
    /** Remotion 渲染服务（index-cpu-ok.js 默认 5569） */
    remotionRenderUrl:
        process.env.REMOTION_RENDER_URL || 'http://localhost:27000',
    mysql,
};
