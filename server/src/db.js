const mysql = require('mysql2/promise');
const config = require('./config');

const { host, port, user, password, database } = config.mysql;

const pool = mysql.createPool({
    host: '114.215.174.159',
    user: 'root',
    password: 'psx0112',
    database: 'lcarus-magic',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = { pool };
