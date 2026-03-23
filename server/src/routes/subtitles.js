const router = require('express').Router();
const { pool } = require('../db');

/**
 * GET /api/subtitles
 * 全量返回字幕列表（subtitles 表），按 id 升序，无分页
 */
router.get('/subtitles', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT `id`, `name`, `code` FROM `subtitles` ORDER BY `id` ASC'
        );
        res.status(200).json({
            message: '获取字幕列表成功',
            data: rows || [],
        });
    } catch (error) {
        console.error('[Subtitles] 获取字幕列表失败:', error.message);
        res.status(500).json({
            message: '获取字幕列表失败',
            error: error.message,
        });
    }
});

module.exports = router;
