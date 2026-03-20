const { pool } = require('./db');

/**
 * 按 time（YYYYMMDD）全量覆盖：写入前 DELETE 掉表中所有 time=该日期的行，再批量 INSERT（每次 GET 拉取 = 当日数据刷新一次）
 * @param {string} timeYmd
 * @param {Array<{
 *   title?: string,
 *   summary?: string,
 *   material?: unknown,
 *   remake?: string,
 *   source?: unknown
 * }>} items
 */
async function replaceHotDataForDate(timeYmd, items) {
    if (!Array.isArray(items)) {
        throw new Error('热点数据应为 JSON 数组');
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 每次拉取全量更新：先删掉该 YYYYMMDD 下旧数据，再插入本次上游返回的列表
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

module.exports = { replaceHotDataForDate };
