const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec } = require('child_process');
const mkdirp = require('mkdirp');

const execAsync = util.promisify(exec);

const app = express();
const port = 3000;

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
 * Body: { script: string, cwd?: string }
 * - script: UTF-8 多行命令经 Base64 编码后的字符串（与主服务 all_commands_joined 一致）
 * - cwd: 工作目录，缺省为 file-server 根目录（与 download-files 落盘相对路径一致）
 */
app.post('/run-shell', async (req, res) => {
    const { script, cwd } = req.body || {};
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
        return res.json({
            success: true,
            message: '执行成功',
            lineCount: lines.length,
            cwd: workDir,
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


