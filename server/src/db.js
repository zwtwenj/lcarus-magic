const mysql = require('mysql2/promise');
const env = require('dotenv').config();

/** 数据库直连（明码；生产环境建议改回环境变量） */
const pool = mysql.createPool({
    host: env.parsed.MYSQL_ADDRESS,
    user: env.parsed.MYSQL_USER,
    password: env.parsed.MYSQL_PASSWORD,
    database: env.parsed.MYSQL_NAME,
    port: env.parsed.MYSQL_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = { pool };
