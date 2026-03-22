const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFileAndGetUrl } = require('../oss');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads', 'sound');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'audio-' + uniqueSuffix + ext);
    }
});

// 创建multer实例
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB限制
    },
    fileFilter: function (req, file, cb) {
        // 只允许上传wav文件
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.wav') {
            cb(null, true);
        } else {
            cb(new Error('只支持上传wav格式的音频文件'), false);
        }
    }
});

/**
 * POST /api/sound/enroll
 * 接收客户端传输的mov音频文件，用于声音复刻
 */
router.post('/sound/enroll', upload.single('audio'), async (req, res) => {
    try {
        // 检查文件是否上传成功
        if (!req.file) {
            return res.status(400).json({
                message: '请上传wav格式的音频文件'
            });
        }

        // 获取文件信息
        const { filename, path: filePath, size, originalname } = req.file;

        // 上传到OSS
        const ossFileName = `sound/${filename}`;
        const ossUrl = await uploadFileAndGetUrl(filePath, ossFileName);

        // 这里可以添加后续的声音复刻逻辑
        // 例如调用cosyvoice API创建语音模型

        // 返回成功响应
        res.status(200).json({
            message: '音频文件上传成功',
            data: {
                filename,
                originalname,
                size,
                path: filePath,
                ossUrl,
                uploadTime: new Date().toISOString()
            }
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
 * GET /api/sound/uploads
 * 获取上传的音频文件列表
 */
router.get('/sound/uploads', async (req, res) => {
    try {
        // 读取上传目录
        const files = fs.readdirSync(uploadDir);
        
        // 过滤出wav文件
        const wavFiles = files.filter(file => path.extname(file).toLowerCase() === '.wav');
        
        // 获取文件信息
        const fileList = wavFiles.map(filename => {
            const filePath = path.join(uploadDir, filename);
            const stats = fs.statSync(filePath);
            return {
                filename,
                size: stats.size,
                mtime: stats.mtime.toISOString()
            };
        });
        
        res.status(200).json({
            message: '获取音频文件列表成功',
            data: fileList
        });
    } catch (error) {
        console.error('[Sound] 获取音频文件列表失败:', error.message);
        res.status(500).json({
            message: '获取音频文件列表失败',
            error: error.message
        });
    }
});

module.exports = router;
