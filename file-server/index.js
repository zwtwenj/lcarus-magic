const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec } = require('child_process');
const mkdirp = require('mkdirp');
const OSS = require('ali-oss');

const execAsync = util.promisify(exec);

const app = express();
const port = 3001;

// OSS 配置（从环境变量读取）
const ossClient = new OSS({
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || 'icarus1',
});

// 解析 JSON 请求体
app.use(express.json());

app.post('/download-files', async (req, res) => {
    const { project, files } = req.body;

    // 参数校验
    if (!project || !files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: '缺少必要参数：project 或 files' });
    }

    const downloadDir = path.join(__dirname, project);

    try {
        // 1. 创建项目文件夹（递归创建）
        await mkdirp(downloadDir);
        console.log(`✅ 已创建目录：${downloadDir}`);

        const successFiles = [];
        const failedFiles = [];

        // 2. 遍历文件列表，逐个下载
        for (const fileUrl of files) {
            try {
                // 提取文件名（从 URL 最后一段获取，或自定义）
                const fileName = path.basename(fileUrl) || 'unknown-file';
                const filePath = path.join(downloadDir, fileName);

                // 发起 GET 请求下载文件（流式写入，避免内存溢出）
                const response = await axios({
                    url: fileUrl,
                    method: 'GET',
                    responseType: 'stream' // 关键：以流的形式接收响应
                });

                // 将响应流写入本地文件
                await new Promise((resolve, reject) => {
                    response.data.pipe(fs.createWriteStream(filePath))
                        .on('finish', resolve)
                        .on('error', reject);
                });

                successFiles.push(fileName);
                console.log(`✅ 成功下载：${fileName}`);
            } catch (err) {
                failedFiles.push(fileUrl);
                console.error(`❌ 下载失败：${fileUrl}`, err.message);
            }
        }

        // 3. 响应结果
        res.json({
            message: '文件下载完成',
            success: successFiles,
            failed: failedFiles
        });

    } catch (err) {
        console.error('目录创建失败或服务器错误：', err.message);
        res.status(500).json({ error: '服务器内部错误', details: err.message });
    }
});

/**
 * 按行执行 shell 命令（危险：勿对公网暴露）。
 * POST /run-shell
 * Body: { script: string, cwd?: string, project?: string, outputName?: string }
 * - script: UTF-8 多行命令经 Base64 编码后的字符串（与主服务 all_commands_joined 一致）
 * - cwd: 工作目录，缺省为 file-server 根目录（与 download-files 落盘相对路径一致）
 * - project: 项目名称，用于定位生成的文件路径
 * - outputName: 输出文件名（不含扩展名）
 */
app.post('/run-shell', async (req, res) => {
    const { script, cwd, project, outputName } = req.body || {};
    if (typeof script !== 'string' || !script.trim()) {
        return res.status(400).json({ error: '缺少 script（Base64 编码的多行 shell）' });
    }
    const workDir =
        typeof cwd === 'string' && cwd.trim()
            ? path.resolve(cwd)
            : __dirname;

    const scriptText = Buffer.from(script.trim(), 'base64').toString('utf8');
    if (!scriptText.trim()) {
        return res.status(400).json({ error: '解码后 script 为空' });
    }

    const lines = scriptText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) {
        return res.status(400).json({ error: 'script 中无有效命令行' });
    }

    const execOpts = {
        cwd: workDir,
        maxBuffer: 64 * 1024 * 1024,
        timeout: 600000,
        windowsHide: true,
    };

    try {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            console.log(
                `[run-shell] ${i + 1}/${lines.length}`,
                line.length > 200 ? `${line.slice(0, 200)}…` : line
            );
            await execAsync(line, execOpts);
        }

        // 如果提供了 project 和 outputName，尝试上传到 OSS
        let ossUrl = null;
        if (project && outputName) {
            const localFilePath = path.join(__dirname, project, `${outputName}.mp4`);
            
            if (fs.existsSync(localFilePath)) {
                try {
                    const ossFileName = `generate/${outputName}.mp4`;
                    console.log(`📤 开始上传到 OSS：${localFilePath} -> ${ossFileName}`);
                    
                    const result = await ossClient.put(ossFileName, localFilePath);
                    ossUrl = `https://${ossClient.options.bucket}.${ossClient.options.region}.aliyuncs.com/${ossFileName}`;
                    
                    console.log(`✅ OSS 上传成功：${ossUrl}`);
                } catch (ossErr) {
                    console.error('❌ OSS 上传失败：', ossErr.message);
                    // OSS 上传失败不影响整体流程，继续返回成功
                }
            } else {
                console.warn(`⚠️ 生成的文件不存在：${localFilePath}`);
            }
        }

        return res.json({
            success: true,
            message: '执行成功',
            lineCount: lines.length,
            cwd: workDir,
            ossUrl: ossUrl
        });
    } catch (err) {
        console.error('[run-shell] 失败:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message || '执行失败',
            stderr: err.stderr,
            stdout: err.stdout,
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 服务已启动：http://localhost:${port}`);
});