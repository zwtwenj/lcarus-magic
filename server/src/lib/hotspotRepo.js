const { pool } = require('./db');

function parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * 查询指定日期热点
 * @param {string} timeYmd
 * @returns {Promise<Array>}
 */
async function getHotDataForDate(timeYmd) {
    const [rows] = await pool.query(
        'SELECT id, title, summary, material, remake, source FROM `hot-data` WHERE `time` = ? ORDER BY id ASC',
        [timeYmd]
    );
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        material: parseJsonArray(row.material),
        remake: row.remake,
        source: parseJsonArray(row.source),
    }));
}

/**
 * 按 id 查询单条热点
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getHotDataById(id) {
    const [rows] = await pool.query(
        'SELECT id, time, title, summary, material, remake, source, coze_text FROM `hot-data` WHERE id = ? LIMIT 1',
        [id]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: row.id,
        time: row.time,
        title: row.title,
        summary: row.summary,
        material: parseJsonArray(row.material),
        remake: row.remake,
        source: parseJsonArray(row.source),
        coze_text: row.coze_text ?? null,
    };
}

/**
 * 插入指定日期热点（不删除旧数据）
 * @param {string} timeYmd
 * @param {Array<{
 *   title?: string,
 *   summary?: string,
 *   material?: unknown,
 *   remake?: string,
 *   source?: unknown
 * }>} items
 */
async function saveHotDataForDate(timeYmd, items) {
    if (!Array.isArray(items)) {
        throw new Error('热点数据应为 JSON 数组');
    }

    const conn = await pool.getConnection();
    try {
        const insertSql = `
      INSERT INTO \`hot-data\` (\`time\`, \`title\`, \`summary\`, \`material\`, \`remake\`, \`source\`)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        for (const row of items) {
            const material = Array.isArray(row.material) ? row.material : [];
            const source = Array.isArray(row.source) ? row.source : [];
            await conn.query(insertSql, [
                timeYmd,
                row.title != null ? String(row.title) : '',
                row.summary != null ? String(row.summary) : null,
                JSON.stringify(material),
                row.remake != null ? String(row.remake) : null,
                JSON.stringify(source),
            ]);
        }
    } catch (e) {
        throw e;
    } finally {
        conn.release();
    }
}

/**
 * 覆盖指定日期热点（先删后插）
 * @param {string} timeYmd
 * @param {Array} items
 */
async function replaceHotDataForDate(timeYmd, items) {
    if (!Array.isArray(items)) {
        throw new Error('热点数据应为 JSON 数组');
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM `hot-data` WHERE `time` = ?', [timeYmd]);

        const insertSql = `
      INSERT INTO \`hot-data\` (\`time\`, \`title\`, \`summary\`, \`material\`, \`remake\`, \`source\`)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        for (const row of items) {
            const material = Array.isArray(row.material) ? row.material : [];
            const source = Array.isArray(row.source) ? row.source : [];
            await conn.query(insertSql, [
                timeYmd,
                row.title != null ? String(row.title) : '',
                row.summary != null ? String(row.summary) : null,
                JSON.stringify(material),
                row.remake != null ? String(row.remake) : null,
                JSON.stringify(source),
            ]);
        }

        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

module.exports = {
    getHotDataById,
    getHotDataForDate,
    saveHotDataForDate,
    replaceHotDataForDate,
};
