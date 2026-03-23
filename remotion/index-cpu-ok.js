/**
 * Remotion 渲染服务 — 渲染时启用 GPU
 * ----------------------------------------
 * 当 useGPU 为 true 时：
 * - Linux 两种模式（若感觉「越优化越慢」，可改用轻量路径对比）：
 *   1) 轻量路径（推荐先试）：REMOTION_GL=swiftshader 或 REMOTION_USE_HEADLESS_SHELL=1
 *      使用自带 headless-shell + 软件 GL，不下载 Chrome for Testing，无头环境下往往更快、更稳。
 *   2) 真实 GPU：REMOTION_GL=angle-egl 或 REMOTION_GL=vulkan
 *      使用 Chrome for Testing + 硬件 GL，需装好 EGL/Vulkan；部分机器上反而更慢（驱动/进程开销）。
 * 编码阶段：hardwareAcceleration: true，尽量使用硬件编码（Linux 是否 NVENC 视 Remotion 版本而定）。
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

// 渲染并发控制：单 GPU 时多任务会争用导致变慢，因此 GPU 串行、CPU 可配置并行
const MAX_CONCURRENT_GPU_RENDERS = 1;
const MAX_CONCURRENT_CPU_RENDERS = 2;

const renderSlots = { gpu: { active: 0, queue: [] }, cpu: { active: 0, queue: [] } };

function acquireRenderSlot(useGPU) {
    const key = useGPU ? 'gpu' : 'cpu';
    const max = useGPU ? MAX_CONCURRENT_GPU_RENDERS : MAX_CONCURRENT_CPU_RENDERS;
    const s = renderSlots[key];
    if (s.active < max) {
        s.active++;
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        s.queue.push(resolve);
    });
}

function releaseRenderSlot(useGPU) {
    const key = useGPU ? 'gpu' : 'cpu';
    const max = useGPU ? MAX_CONCURRENT_GPU_RENDERS : MAX_CONCURRENT_CPU_RENDERS;
    const s = renderSlots[key];
    s.active--;
    if (s.queue.length > 0) {
        s.active++;
        const next = s.queue.shift();
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

// 暴露视频生成接口（JSON body 须用 POST；GET 无法可靠携带 body）
function resolveCompositionFromBody(body) {
    body = body || {};
    let compositionId = body.compositionId;
    let inputProps = body.inputProps || {};
    const isFlatLottieProps =
        body.id &&
        body.inputProps &&
        typeof body.inputProps === 'object' &&
        !Array.isArray(body.inputProps);
    // 字幕：{ id: AE 样式如 guodong, inputProps: { TEXT1: "..." } } → LottieText + { id, props }
    if (!compositionId && isFlatLottieProps) {
        compositionId = 'LottieText';
        inputProps = { id: body.id, props: body.inputProps };
    } else if (compositionId === 'LottieText' && isFlatLottieProps) {
        inputProps = { id: body.id, props: body.inputProps };
    } else if (!compositionId) {
        compositionId = 'ParticleShow';
    }
    return { compositionId, inputProps };
}

app.get('/api/render-video', (req, res) => {
    res.status(405).json({
        error: '请使用 POST /api/render-video',
        hint: '须携带 JSON body（含 id、inputProps 等）；GET 无法可靠传 body',
    });
});

app.post('/api/render-video', async (req, res) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const jobStart = Date.now();
    console.log(`[${ts()}] [${requestId}] 收到渲染请求`);

    const useGPU = req.body && req.body.useGPU !== false;
    let renderSlotAcquired = false;
    try {
        const t1 = Date.now();
        const serveUrl = await getBundle();
        console.log(`[${ts()}] [${requestId}] getBundle 完成${elapsed(jobStart)}，本步耗时 ${Date.now() - t1}ms`);

        const slotStart = Date.now();
        await acquireRenderSlot(useGPU);
        renderSlotAcquired = true;
        if (Date.now() - slotStart > 100) {
            console.log(`[${ts()}] [${requestId}] 获得${useGPU ? 'GPU' : 'CPU'}渲染槽（排队等待 ${Date.now() - slotStart}ms）${elapsed(jobStart)}`);
        }

        const t2 = Date.now();
        const { compositionId, inputProps } = resolveCompositionFromBody(req.body);
        const composition = await selectComposition({
            serveUrl,
            id: compositionId,
            inputProps,
        });
        console.log(`[${ts()}] [${requestId}] selectComposition 完成${elapsed(jobStart)}，本步耗时 ${Date.now() - t2}ms`);
        console.log(`[${ts()}] [${requestId}] Composition:`, {
            id: composition.id,
            width: composition.width,
            height: composition.height,
            fps: composition.fps,
            durationInFrames: composition.durationInFrames,
        });

        const outputDir = path.join(__dirname, 'Output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`[${ts()}] [${requestId}] 创建输出目录: ${outputDir}`);
        }

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
        };

        if (useGPU) {
            renderOptions.hardwareAcceleration = true;
            renderOptions.videoBitrate = (req.body && req.body.videoBitrate) || '10M';
            // Linux：可选「轻量路径」避免越优化越慢（见文件头注释）
            // REMOTION_GL=swiftshader 或 REMOTION_USE_HEADLESS_SHELL=1 → 用自带的 headless-shell + 软件 GL，不下载 Chrome for Testing，往往更快
            // REMOTION_GL=angle-egl 或 vulkan → 用 Chrome for Testing + 真实 GPU，需装好 EGL/Vulkan，有时反而更慢
            if (process.platform === 'linux') {
                const useHeadlessShell = process.env.REMOTION_USE_HEADLESS_SHELL === '1' || process.env.REMOTION_GL === 'swiftshader';
                const glBackend = process.env.REMOTION_GL || 'angle-egl';
                if (useHeadlessShell) {
                    renderOptions.chromiumOptions = { gl: 'swiftshader' };
                    console.log(`[${ts()}] [${requestId}] 已启用 GPU 渲染（轻量路径），GL=swiftshader，不使用 Chrome for Testing，videoBitrate: ${renderOptions.videoBitrate}${elapsed(jobStart)}`);
                } else {
                    renderOptions.chromeMode = 'chrome-for-testing';
                    renderOptions.chromiumOptions = { gl: glBackend };
                    console.log(`[${ts()}] [${requestId}] 已启用 GPU 渲染，chromeMode=chrome-for-testing，GL=${glBackend}，videoBitrate: ${renderOptions.videoBitrate}${elapsed(jobStart)}`);
                }
            } else {
                console.log(`[${ts()}] [${requestId}] 已启用 GPU 渲染，videoBitrate: ${renderOptions.videoBitrate}${elapsed(jobStart)}`);
            }
        } else {
            renderOptions.crf = (req.body && req.body.crf) != null ? req.body.crf : 18;
            console.log(`[${ts()}] [${requestId}] 使用 CPU 渲染，crf: ${renderOptions.crf}${elapsed(jobStart)}`);
        }

        const t3 = Date.now();
        console.log(`[${ts()}] [${requestId}] 开始 renderMedia${elapsed(jobStart)}`);
        await renderMedia(renderOptions);
        const renderMs = Date.now() - t3;
        console.log(`[${ts()}] [${requestId}] renderMedia 完成，渲染耗时 ${renderMs}ms，总耗时 ${Date.now() - jobStart}ms`);

        const fileSize = fs.statSync(outputPath).size;
        console.log(`[${ts()}] [${requestId}] 视频已写入: ${outputPath}，大小: ${fileSize} bytes (${(fileSize / 1024).toFixed(1)} KB)${elapsed(jobStart)}`);

        res.download(outputPath, fileName, (err) => {
            const totalMs = Date.now() - jobStart;
            if (err) {
                console.error(`[${ts()}] [${requestId}] 向客户端发送文件失败，总耗时 ${totalMs}ms:`, err);
            } else {
                console.log(`[${ts()}] [${requestId}] 文件已发送给客户端，保留在: ${outputPath}，总耗时 ${totalMs}ms`);
            }
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
            releaseRenderSlot(useGPU);
        }
    }
});

// GPU 基准测试：同一段短片分别用 GPU 和 CPU 渲染，对比耗时，验证 GPU 是否真正加速
app.get('/api/benchmark-gpu', async (req, res) => {
    const requestId = `bench-${Date.now()}`;
    const frames = Math.min(Math.max(parseInt(req.query.frames, 10) || 90, 30), 300);
    const outputDir = path.join(__dirname, 'Output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log(`[${ts()}] [${requestId}] 开始 GPU 基准测试，帧数: ${frames}`);

    try {
        const serveUrl = await getBundle();
        const composition = await selectComposition({
            serveUrl,
            id: 'ParticleShow',
            inputProps: {},
        });

        const baseOpts = {
            composition,
            serveUrl,
            codec: 'h264',
            timeoutInMilliseconds: 120000,
            frameRange: [0, Math.min(frames - 1, composition.durationInFrames - 1)],
        };

        const outGpu = path.join(outputDir, `bench-gpu-${Date.now()}.mp4`);
        const outCpu = path.join(outputDir, `bench-cpu-${Date.now()}.mp4`);

        await acquireRenderSlot(true);
        const t0 = Date.now();
        await renderMedia({
            ...baseOpts,
            outputLocation: outGpu,
            hardwareAcceleration: true,
            videoBitrate: '10M',
            ...(process.platform === 'linux' ? {
                chromeMode: 'chrome-for-testing',
                chromiumOptions: { gl: process.env.REMOTION_GL || 'angle-egl' },
            } : {}),
        });
        const gpuTimeMs = Date.now() - t0;
        releaseRenderSlot(true);
        console.log(`[${ts()}] [${requestId}] GPU 渲染完成，耗时 ${gpuTimeMs}ms`);

        await acquireRenderSlot(false);
        const t1 = Date.now();
        await renderMedia({
            ...baseOpts,
            outputLocation: outCpu,
            crf: 18,
        });
        const cpuTimeMs = Date.now() - t1;
        releaseRenderSlot(false);
        console.log(`[${ts()}] [${requestId}] CPU 渲染完成，耗时 ${cpuTimeMs}ms`);

        const faster = gpuTimeMs < cpuTimeMs ? 'gpu' : 'cpu';
        const speedup = faster === 'gpu' ? (cpuTimeMs / gpuTimeMs).toFixed(2) : (gpuTimeMs / cpuTimeMs).toFixed(2);

        const result = {
            frames,
            gpuTimeMs,
            cpuTimeMs,
            faster,
            speedupRatio: parseFloat(speedup),
            summary: faster === 'gpu'
                ? `GPU 更快：${gpuTimeMs}ms vs CPU ${cpuTimeMs}ms，约 ${speedup}x 加速`
                : `CPU 更快：${cpuTimeMs}ms vs GPU ${gpuTimeMs}ms，GPU 未带来加速（可能未真正使用）`,
            tip: '在另一终端运行 watch -n 0.5 nvidia-smi 可观察渲染时 GPU 是否有占用。',
        };
        console.log(`[${ts()}] [${requestId}] 基准测试结果:`, result.summary);
        res.json(result);
    } catch (error) {
        console.error(`[${ts()}] [${requestId}] 基准测试失败:`, error);
        res.status(500).json({ error: '基准测试失败', details: error.message });
    }
});

const PORT = 5569;
app.listen(PORT, () => {
    console.log(`[${ts()}] Remotion 服务端已启动，监听 http://localhost:${PORT}`);
    console.log(`[${ts()}] GPU 基准测试: GET /api/benchmark-gpu?frames=90 可对比 GPU vs CPU 渲染耗时`);
    console.log(`[${ts()}] 渲染并发: GPU=${MAX_CONCURRENT_GPU_RENDERS}（串行以充分利用单 GPU），CPU=${MAX_CONCURRENT_CPU_RENDERS}`);
    if (process.platform === 'linux') {
        const glBackend = process.env.REMOTION_GL || 'angle-egl';
        console.log(`[${ts()}] 渲染已启用 GPU：chromeMode=chrome-for-testing，GL=${glBackend}。若报错请按 docs/一定要用GPU渲染-操作清单.md 安装依赖或试 REMOTION_GL=vulkan；回退软件渲染设 REMOTION_GL=swiftshader。`);
    }
    if (process.env.REMOTION_CONCURRENCY) {
        const max = require('os').cpus().length;
        const v = parseInt(process.env.REMOTION_CONCURRENCY, 10);
        console.log(`[${ts()}] REMOTION_CONCURRENCY=${process.env.REMOTION_CONCURRENCY}（单次渲染内并行帧数，实际不超过 ${max} 核）`);
    }
});