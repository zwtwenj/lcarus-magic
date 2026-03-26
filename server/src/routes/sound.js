const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');
const { uploadBufferAndGetUrl } = require('../oss');
const { synthesizeFromUrlAndText } = require('../cosyvoice');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB限制
    },
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const mime = (file.mimetype || '').toLowerCase();
        const okExt = ext === '.wav' || ext === '.mp3';
        const okMime =
            mime === 'audio/wav' ||
            mime === 'audio/x-wav' ||
            mime === 'audio/wave' ||
            mime === 'audio/mpeg' ||
            mime === 'audio/mp3';
        if (okExt || okMime) {
            cb(null, true);
        } else {
            cb(new Error('只支持上传 wav、mp3 格式的音频文件'), false);
        }
    },
});

const materialUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
    },
    fileFilter: function (req, file, cb) {
        const mime = (file.mimetype || '').toLowerCase();
        if (mime.startsWith('image/') || mime.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('只支持上传图片或视频素材'), false);
        }
    },
});

/**
 * 从合成得到的 MP3 Buffer 解析时长（秒）
 * @param {Buffer} buf
 * @returns {Promise<number|undefined>}
 */
async function getSynthAudioDurationSeconds(buf) {
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
        return undefined;
    }
    try {
        const { parseBuffer } = await import('music-metadata');
        const meta = await parseBuffer(buf, 'audio/mpeg');
        const d = meta.format.duration;
        if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
            return Math.round(d * 1000) / 1000;
        }
    } catch (e) {
        console.warn('[Sound] 解析合成音频时长失败:', e.message);
    }
    return undefined;
}

/**
 * GET /api/sound/defaults
 * 获取语音合成用默认参考音（sounds 表：id、title、ossurl）
 */
router.get('/sound/defaults', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT `id`, `title`, `ossurl` FROM `sounds` ORDER BY `id` ASC'
        );
        const data = (rows || []).map((row) => ({
            id: row.id,
            title: row.title,
            ossUrl: row.ossurl,
        }));
        res.status(200).json({
            message: '获取默认声音列表成功',
            data,
        });
    } catch (error) {
        console.error('[Sound] 获取默认声音失败:', error.message);
        res.status(500).json({
            message: '获取默认声音失败',
            error: error.message,
        });
    }
});

/**
 * POST /api/sound/enroll
 * 接收 wav / mp3 参考音频，用于声音复刻
 */
router.post('/sound/enroll', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: '请上传 wav 或 mp3 格式的音频文件',
            });
        }

        const { buffer, size, originalname, mimetype } = req.file;
        let ext = path.extname(originalname || '').toLowerCase();
        if (ext !== '.wav' && ext !== '.mp3') {
            const m = (mimetype || '').toLowerCase();
            if (m === 'audio/mpeg' || m === 'audio/mp3') {
                ext = '.mp3';
            } else {
                ext = '.wav';
            }
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const objectName = `sound/audio-${uniqueSuffix}${ext}`;
        const ossUrl = await uploadBufferAndGetUrl(buffer, objectName);

        res.status(200).json({
            message: '音频文件上传成功',
            data: {
                filename: path.basename(objectName),
                originalname,
                size,
                ossUrl,
                uploadTime: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('[Sound] 上传音频文件失败:', error.message);
        res.status(500).json({
            message: '上传音频文件失败',
            error: error.message
        });
    }
});

/**
 * POST /api/material/enroll
 * 接收图片 / 视频素材，上传到 OSS
 */
router.post('/material/enroll', materialUpload.single('material'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: '请上传素材文件（图片或视频）',
            });
        }
        const { buffer, size, originalname } = req.file;
        const ext = path.extname(originalname || '').toLowerCase() || '';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const objectName = `material/${uniqueSuffix}${ext}`;
        const ossUrl = await uploadBufferAndGetUrl(buffer, objectName);

        return res.status(200).json({
            message: '素材上传成功',
            data: {
                filename: path.basename(objectName),
                originalname,
                size,
                ossUrl,
                uploadTime: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('[Material] 上传素材失败:', error.message);
        return res.status(500).json({
            message: '上传素材失败',
            error: error.message,
        });
    }
});

/**
 * POST /api/sound/synthesize
 * 入参：url（参考音频公网 URL）、text（待合成文本）
 */
router.post('/sound/synthesize', async (req, res) => {
    try {
        const { url, text } = req.body || {};
        if (url == null || text == null) {
            return res.status(400).json({
                message: '请提供 url 与 text',
            });
        }
        if (typeof url !== 'string' || typeof text !== 'string') {
            return res.status(400).json({
                message: 'url 与 text 须为字符串',
            });
        }

        const { audio, format, voiceId } = await synthesizeFromUrlAndText(
            url,
            text
        );

        const ext =
            format && typeof format === 'string' ? `.${format.replace(/^\./, '')}` : '.mp3';
        const synthFilename = `synth-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const ossObjectKey = `sound/${synthFilename}`;
        const ossUrl = await uploadBufferAndGetUrl(audio, ossObjectKey);

        const durationSeconds = await getSynthAudioDurationSeconds(audio);

        res.status(200).json({
            message: '语音合成成功',
            data: {
                format: format || 'mp3',
                voiceId,
                audioBase64: audio.toString('base64'),
                mimeType: 'audio/mpeg',
                ossUrl: ossUrl || undefined,
                /** 合成音频时长（秒），解析失败时为 null */
                durationSeconds:
                    durationSeconds != null ? durationSeconds : null,
            },
        });
    } catch (error) {
        console.error('[Sound] 语音合成失败:', error.message);
        const status =
            error.message === 'url is required' ||
            error.message === 'text is required'
                ? 400
                : 500;
        res.status(status).json({
            message: status === 400 ? error.message : '语音合成失败',
            error: error.message,
        });
    }
});

module.exports = router;
