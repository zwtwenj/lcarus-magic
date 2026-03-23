/**
 * Remotion 渲染服务 — 当前仅 CPU 渲染（已暂时关闭 GPU / 硬件编码相关逻辑）。
 */
const express = require('express');
const cors = require('cors');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { bundle } = require('@remotion/bundler');
const path = require('path');
const fs = require('fs');

// 时间戳 [YYYY-MM-DD HH:mm:ss.SSS]
function ts() {
    const d = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
// 距某时刻的耗时
function elapsed(since) {
    return since != null ? ` +${Date.now() - since}ms` : '';
}

const app = express();
app.use(cors());
app.use(express.json());

// 配置静态文件服务，让 Output 目录可以通过 /videos/ 路径访问
const outputDir = path.join(__dirname, 'Output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
app.use('/videos', express.static(outputDir));

// 渲染并发控制（仅 CPU）
const MAX_CONCURRENT_RENDERS = 2;
const renderSlot = { active: 0, queue: [] };

function acquireRenderSlot() {
    if (renderSlot.active < MAX_CONCURRENT_RENDERS) {
        renderSlot.active++;
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        renderSlot.queue.push(resolve);
    });
}

function releaseRenderSlot() {
    renderSlot.active--;
    if (renderSlot.queue.length > 0) {
        renderSlot.active++;
        const next = renderSlot.queue.shift();
        next();
    }
}

// 缓存 bundle 路径，避免每次都重新打包
let cachedBundlePath = null;
let bundlePromise = null;

async function getBundle() {
    if (cachedBundlePath) {
        return cachedBundlePath;
    }
    if (!bundlePromise) {
        bundlePromise = (async () => {
            const t0 = Date.now();
            console.log(`[${ts()}] [getBundle] 开始打包 Remotion 项目...`);
            const entryPoint = path.resolve(__dirname, 'index.ts');
            const bundlePath = await bundle({
                entryPoint,
                publicDir: path.resolve(__dirname), // 设置 publicDir 为 server 目录，这样 staticFile("AE/text.json") 能找到文件
                webpackOverride: (config) => config,
            });
            cachedBundlePath = bundlePath;
            console.log(`[${ts()}] [getBundle] 打包完成，路径: ${bundlePath}，耗时 ${Date.now() - t0}ms`);
            return bundlePath;
        })();
    }
    return await bundlePromise;
}

function generateUniqueFileName(outputDir, requestId) {
    let fileName;
    let filePath;
    let attempts = 0;
    const maxAttempts = 100;
    do {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        fileName = `output-${timestamp}-${random}.mp4`;
        filePath = path.join(outputDir, fileName);
        attempts++;
        if (attempts >= maxAttempts) {
            throw new Error('无法生成唯一的文件名，请重试');
        }
    } while (fs.existsSync(filePath));
    if (attempts > 1 && requestId) {
        console.log(`[${ts()}] [${requestId}] generateUniqueFileName 重试 ${attempts} 次后得到: ${fileName}`);
    }
    return { fileName, filePath };
}

// 安全过滤 rc 参数的工具函数（处理非字符串参数）
function safeFilterRcArgs(args) {
    // 先过滤掉非字符串参数，再转成字符串，最后过滤 rc 相关
    return args
        .filter(arg => arg != null && typeof arg !== 'undefined') // 过滤 null/undefined
        .map(arg => String(arg)) // 确保所有参数都是字符串
        .filter(arg => {
            // 过滤 rc 相关参数
            return !arg.startsWith('-rc') && arg !== 'rc' && !arg.includes('rc=');
        });
}

// 暴露视频生成接口
app.post('/api/render-video', async (req, res) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const jobStart = Date.now();
    console.log(`[${ts()}] [${requestId}] 收到渲染请求`);

    // 从请求 body 中获取参数
    const compositionId = 'LottieText';
    const configId = req.body.id || 'subtitles';
    const inputProps = req.body.inputProps || {};
    
    // 获取视频参数（带默认值）
    const durationInFrames = req.body.durationInFrames || 300;
    const fps = req.body.fps || 30;
    const width = req.body.width || 1920;
    const height = req.body.height || 1080;
    
    console.log(req.body);

    let renderSlotAcquired = false;
    try {
        const t1 = Date.now();
        const serveUrl = await getBundle();
        console.log(`[${ts()}] [${requestId}] getBundle 完成${elapsed(jobStart)}，本步耗时 ${Date.now() - t1}ms`);

        const slotStart = Date.now();
        await acquireRenderSlot();
        renderSlotAcquired = true;
        if (Date.now() - slotStart > 100) {
            console.log(`[${ts()}] [${requestId}] 获得渲染槽（排队等待 ${Date.now() - slotStart}ms）${elapsed(jobStart)}`);
        }

        const t2 = Date.now();
        const composition = await selectComposition({
            serveUrl,
            id: compositionId,
            inputProps: {
                id: configId,
                props: inputProps,
            },
        });
        console.log(`[${ts()}] [${requestId}] selectComposition 完成${elapsed(jobStart)}，本步耗时 ${Date.now() - t2}ms`);
        
        // 覆盖 composition 的参数（使用请求中的值或默认值）
        composition.durationInFrames = durationInFrames;
        composition.fps = fps;
        composition.width = width;
        composition.height = height;
        
        console.log(`[${ts()}] [${requestId}] Composition:`, {
            id: composition.id,
            width: composition.width,
            height: composition.height,
            fps: composition.fps,
            durationInFrames: composition.durationInFrames,
        });

        const { fileName, filePath: outputPath } = generateUniqueFileName(outputDir, requestId);
        console.log(`[${ts()}] [${requestId}] 输出文件: ${fileName}，完整路径: ${outputPath}${elapsed(jobStart)}`);

        // 并发数：仅当设置 REMOTION_CONCURRENCY 或请求体 concurrency 时生效，且不超过 CPU 核心数（Remotion 硬性限制）
        const os = require('os');
        const cpuCount = os.cpus().length;
        let concurrency = req.body && req.body.concurrency != null ? parseInt(req.body.concurrency, 10) : (process.env.REMOTION_CONCURRENCY ? parseInt(process.env.REMOTION_CONCURRENCY, 10) : null);
        if (concurrency != null && concurrency > 0) {
            if (concurrency > cpuCount) {
                console.log(`[${ts()}] [${requestId}] 指定并发 ${concurrency} 超过 CPU 核心数 ${cpuCount}，已限制为 ${cpuCount}`);
                concurrency = cpuCount;
            } else {
                console.log(`[${ts()}] [${requestId}] 使用并发数: ${concurrency}`);
            }
        }

        const renderOptions = {
            composition,
            serveUrl,
            codec: 'h264',
            outputLocation: outputPath,
            timeoutInMilliseconds: 90000,
            ...(concurrency != null && concurrency > 0 ? { concurrency } : {}),
            crf: (req.body && req.body.crf) != null ? req.body.crf : 18,
            onProgress: (() => {
                let lastPct = -1;
                return ({ progress, renderedFrames, encodedFrames }) => {
                    const pct = progress != null ? Math.round(progress * 100) : null;
                    if (pct == null) return;
                    const milestone = [0, 25, 50, 75, 100].find(m => pct >= m && lastPct < m);
                    if (milestone !== undefined) {
                        lastPct = milestone;
                        console.log(`[${ts()}] [${requestId}] 渲染进度 ${milestone}%，已渲染 ${renderedFrames ?? '-'} 帧，已编码 ${encodedFrames ?? '-'} 帧${elapsed(jobStart)}`);
                    }
                };
            })(),
            ffmpegOverride: ({ type, args }) => {
                let newArgs = safeFilterRcArgs(args);
                newArgs = newArgs.map((arg) => {
                    if (typeof arg === 'string' && arg.includes('element-%d.png')) {
                        return arg.replace('element-%d.png', 'element-%02d.png');
                    }
                    return arg;
                });
                return newArgs;
            },
        };

        console.log(`[${ts()}] [${requestId}] 使用 CPU 渲染，crf: ${renderOptions.crf}${elapsed(jobStart)}`);

        const t3 = Date.now();
        console.log(`[${ts()}] [${requestId}] 开始 renderMedia${elapsed(jobStart)}`);
        await renderMedia(renderOptions);
        const renderMs = Date.now() - t3;
        console.log(`[${ts()}] [${requestId}] renderMedia 完成，渲染耗时 ${renderMs}ms，总耗时 ${Date.now() - jobStart}ms`);

        const fileSize = fs.statSync(outputPath).size;
        console.log(`[${ts()}] [${requestId}] 视频已写入: ${outputPath}，大小: ${fileSize} bytes (${(fileSize / 1024).toFixed(1)} KB)${elapsed(jobStart)}`);

        // 生成视频访问 URL
        // 优先使用环境变量 VIDEO_BASE_URL，否则从请求中获取协议和 host
        const baseUrl = process.env.VIDEO_BASE_URL || 
            `${req.protocol}://${req.get('host')}`;
        const videoUrl = `${baseUrl}/videos/${fileName}`;
        
        const totalMs = Date.now() - jobStart;
        console.log(`[${ts()}] [${requestId}] 视频渲染完成，总耗时 ${totalMs}ms，访问地址: ${videoUrl}`);
        
        // 返回 JSON，包含视频 URL
        res.json({
            success: true,
            requestId,
            videoUrl,
            fileName,
            fileSize,
            duration: totalMs,
        });
    } catch (error) {
        console.error(`[${ts()}] [${requestId}] 渲染失败${elapsed(jobStart)}:`, error);
        if (!res.headersSent) {
            res.status(500).json({
                error: '视频渲染失败',
                details: error.message,
                requestId,
            });
        }
    } finally {
        if (renderSlotAcquired) {
            releaseRenderSlot();
        }
    }
});

const PORT = 27000;
app.listen(PORT, () => {
    console.log(`[${ts()}] Remotion 服务端已启动（仅 CPU 渲染），监听 http://localhost:${PORT}`);
    console.log(`[${ts()}] 渲染并发: 最多 ${MAX_CONCURRENT_RENDERS} 个任务并行`);
    if (process.env.REMOTION_CONCURRENCY) {
        const max = require('os').cpus().length;
        console.log(`[${ts()}] REMOTION_CONCURRENCY=${process.env.REMOTION_CONCURRENCY}（单次渲染内并行帧数，实际不超过 ${max} 核）`);
    }
});