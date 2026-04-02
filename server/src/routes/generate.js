const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { pool } = require('../db');
const { uploadBufferAndGetUrl } = require('../lib/oss');
const { synthesizeFromUrlAndText } = require('../lib/cosyvoice');
const { askImage } = require('../lib/qWenVLFlash');
const { callCozeMaterialMatch, callCozeFfmpegCommand } = require('./coze');
const { buildDownloadFilesPayload } = require('../lib/ffmpeg');
const { generateSrtFromAudios } = require('../lib/subtitle');

const router = express.Router();

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
        console.warn('[generate] 解析合成音频时长失败:', e.message);
    }
    return undefined;
}

function isValidVoiceUrl(url) {
    if (typeof url !== 'string' || !url.trim()) {
        return false;
    }
    return /^https?:\/\//i.test(url.trim());
}

/**
 * 一键生成语音：每条字幕文本调用一次 CosyVoice，结果上传 OSS。
 * @param {{ voice_url: string, lines: string[] }} params
 */
async function runOneClickSpeech({ voice_url, lines }) {
    const refUrl = String(voice_url || '').trim();
    const audios = [];

    // return {
    //     ok: true,
    //     voice_url: refUrl,
    //     count: 4,
    //     audios: [
    //         {
    //             "index": 0,
    //             "text": "2026年3月19日",
    //             "voiceId": "cosyvoice-v3.5-flash-xjvwqmxw-cca42fb0d14d452aac69c9b46552face",
    //             "ossUrl": "https://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/synth-1774862210026-df3fce3dac77.mp3",
    //             "format": "mp3",
    //             "durationSeconds": 2.22
    //         },
    //         {
    //             "index": 1,
    //             "text": "日本首相高市早苗访问美国",
    //             "voiceId": "cosyvoice-v3.5-flash-dsomhobv-d4b6e060270148848e431b7f073cb9af",
    //             "ossUrl": "https://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/synth-1774862222444-152e92f41e00.mp3",
    //             "format": "mp3",
    //             "durationSeconds": 3.5
    //         },
    //         {
    //             "index": 2,
    //             "text": "白宫网站随后公布了其访美照片",
    //             "voiceId": "cosyvoice-v3.5-flash-bwijvfzk-18c29c7a022e4229bab6de2896501d8f",
    //             "ossUrl": "https://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/synth-1774862234587-1a06d5013c21.mp3",
    //             "format": "mp3",
    //             "durationSeconds": 3.5
    //         },
    //         {
    //             "index": 3,
    //             "text": "照片中高市早苗有跳舞、张嘴、与美国总统特朗普交谈时身体前倾等姿态",
    //             "voiceId": "cosyvoice-v3.5-flash-ctyfcqcd-e1d2f89c3acc4d3e86e82b7d436d85ac",
    //             "ossUrl": "https://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/synth-1774862246049-d0add4ebbe37.mp3",
    //             "format": "mp3",
    //             "durationSeconds": 8.438
    //         }
    //     ]
    // }

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        try {
            const { audio, format, voiceId } = await synthesizeFromUrlAndText(
                refUrl,
                text
            );
            const ext =
                format && typeof format === 'string'
                    ? `.${format.replace(/^\./, '')}`
                    : '.mp3';
            const synthFilename = `synth-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
            const ossObjectKey = `sound/${synthFilename}`;
            const ossUrl = await uploadBufferAndGetUrl(audio, ossObjectKey);
            const durationSeconds = await getSynthAudioDurationSeconds(audio);

            audios.push({
                index: i,
                text,
                voiceId,
                ossUrl: ossUrl || undefined,
                format: format || 'mp3',
                durationSeconds:
                    durationSeconds != null ? durationSeconds : null,
            });
        } catch (err) {
            return {
                ok: false,
                status: 502,
                message: '语音合成失败',
                index: i,
                text,
                detail: err.message || String(err),
                audios,
            };
        }
    }

    return {
        ok: true,
        voice_url: refUrl,
        count: audios.length,
        audios,
    };
}

function parseOneClickBody(body) {
    const b = body || {};
    const subtitles_type =
        typeof b.subtitles_type === 'string' && b.subtitles_type.trim()
            ? b.subtitles_type.trim()
            : typeof b.subtitle_type === 'string' && b.subtitle_type.trim()
              ? b.subtitle_type.trim()
              : '';

    let rawList = b.subtitles;
    if (!Array.isArray(rawList) && Array.isArray(b.subtitle_segments)) {
        rawList = b.subtitle_segments;
    }

    const voice_url =
        typeof b.voice_url === 'string' ? b.voice_url.trim() : '';

    const materialList = Array.isArray(b.materialList) ? b.materialList : [];

    return { subtitles_type, rawList, voice_url, materialList };
}

function normalizeMaterialUrls(materialList) {
    return (materialList || [])
        .map((item) => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item.url === 'string') return item.url.trim();
            if (item && typeof item.material_url === 'string') return item.material_url.trim();
            return '';
        })
        .filter(Boolean);
}

/**
 * 解析 Qwen 返回的「JSON」：模型常输出 markdown 代码块、或键未加双引号（非严格 JSON），
 * 直接 JSON.parse 会在某张图上失败（例如 SyntaxError at position 1）。
 * @param {string} answer
 * @returns {string[]}
 */
function parseTipFromQwenAnswer(answer) {
    const raw = String(answer || '').trim();
    if (!raw) return [];

    let body = raw;
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) body = fence[1].trim();

    function tryStrictJson(str) {
        try {
            const o = JSON.parse(str);
            if (Array.isArray(o) && o[0] && typeof o[0] === 'object') {
                const t = o[0].tip;
                if (Array.isArray(t)) return t;
            }
            if (o && typeof o === 'object' && !Array.isArray(o) && Array.isArray(o.tip)) {
                return o.tip;
            }
        } catch {
            /* 非严格 JSON */
        }
        return null;
    }

    let tips = tryStrictJson(body);
    if (tips !== null) return tips;

    const b0 = body.indexOf('{');
    const b1 = body.lastIndexOf('}');
    if (b0 >= 0 && b1 > b0) {
        const slice = body.slice(b0, b1 + 1);
        tips = tryStrictJson(slice);
        if (tips !== null) return tips;
        try {
            const o = new Function('return (' + slice + ')')();
            if (o && typeof o === 'object' && !Array.isArray(o) && Array.isArray(o.tip)) {
                return o.tip;
            }
        } catch {
            /* ignore */
        }
    }

    const a0 = body.indexOf('[');
    const a1 = body.lastIndexOf(']');
    if (a0 >= 0 && a1 > a0) {
        tips = tryStrictJson(body.slice(a0, a1 + 1));
        if (tips !== null) return tips;
    }

    return [];
}

/** material_tip.url_hash：对完整 URL 做 SHA-256 十六进制（64 字符） */
function hashMaterialUrl(materialUrl) {
    return crypto.createHash('sha256').update(String(materialUrl), 'utf8').digest('hex');
}

/** tip 存 varchar(1000)，用 JSON 数组字符串 */
function tipArrayToDbColumn(tip) {
    const s = JSON.stringify(Array.isArray(tip) ? tip : []);
    return s.length > 1000 ? s.slice(0, 1000) : s;
}

/**
 * 写入或更新 material_tip（先按 material_url 更新，无行则插入）
 * @param {import('mysql2/promise').Pool} dbPool
 */
async function upsertMaterialTipRow(dbPool, materialUrl, tipArr) {
    const urlHash = hashMaterialUrl(materialUrl);
    const tipCol = tipArrayToDbColumn(tipArr);
    const [upd] = await dbPool.query(
        'UPDATE material_tip SET tip = ?, url_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE material_url = ?',
        [tipCol, urlHash, materialUrl]
    );
    if (upd.affectedRows > 0) return;
    await dbPool.query(
        'INSERT INTO material_tip (material_url, url_hash, tip, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [materialUrl, urlHash, tipCol]
    );
}

const MATERIAL_VL_TAG_PROMPT =
    "帮我对你收到的这张图片打标，输出 json 格式为 {tip: []}，tip 为标签数组例如 ['清晨', '太阳']，只针对当前这一张图。";

/**
 * 素材列表：查库已有标签、对未命中 URL 调用 Qwen VL 打标并写入 material_tip。
 * @param {import('mysql2/promise').Pool} dbPool
 * @param {unknown[]} materialList parseOneClickBody 中的 materialList
 * @returns {Promise<{ materialTips: object[], stats: { total: number, fromDb: number, calledQwenVlFlash: number } } | null>}
 *   无有效素材 URL 时返回 null
 */
async function processMaterialListTips(dbPool, materialList) {
    const materialUrls = normalizeMaterialUrls(materialList);
    if (materialUrls.length === 0) return null;

    const uniqueUrls = [...new Set(materialUrls)];
    const [rows] = await dbPool.query(
        'SELECT material_url, tip FROM material_tip WHERE material_url IN (?)',
        [uniqueUrls]
    );
    const existingMap = new Map(
        (rows || []).map((r) => [
            String(r.material_url),
            {
                material_url: r.material_url,
                tip: r.tip ?? null,
            },
        ])
    );
    const images = uniqueUrls.filter((url) => !existingMap.has(url));

    const generated = [];
    if (images.length > 0) {
        const out = await askImage({ images, prompt: MATERIAL_VL_TAG_PROMPT });
        for (const item of out.results || []) {
            const tip = parseTipFromQwenAnswer(item.answer);
            await upsertMaterialTipRow(dbPool, item.image, tip);
            generated.push({
                material_url: item.image,
                tip,
                source: 'qwen-vl-flash',
            });
        }
    }

    return {
        materialTips: [...existingMap.values(), ...generated],
        stats: {
            total: uniqueUrls.length,
            fromDb: existingMap.size,
            calledQwenVlFlash: images.length,
        },
    };
}

/**
 * 处理一键生成中的语音阶段：参数校验 + 文本归一化 + 调用 CosyVoice。
 * @param {{ rawList: unknown, voice_url: string }} params
 */
async function processOneClickSpeechStage({ rawList, voice_url }) {
    if (!Array.isArray(rawList)) {
        return {
            ok: false,
            status: 400,
            body: {
                success: false,
                stage: 'speech',
                message: '缺少字幕列表：subtitles 或 subtitle_segments（须为字符串数组）',
            },
        };
    }

    const lines = rawList
        .map((s) => (s == null ? '' : String(s).trim()))
        .filter(Boolean);

    if (lines.length === 0) {
        return {
            ok: false,
            status: 400,
            body: {
                success: false,
                stage: 'speech',
                message: '字幕列表无有效条目',
            },
        };
    }

    if (!isValidVoiceUrl(voice_url)) {
        return {
            ok: false,
            status: 400,
            body: {
                success: false,
                stage: 'speech',
                message: '缺少有效的 voice_url（参考音公网 HTTPS/HTTP 地址）',
            },
        };
    }

    const speechResult = await runOneClickSpeech({
        voice_url,
        lines,
    });

    if (!speechResult.ok) {
        return {
            ok: false,
            status: speechResult.status,
            body: {
                success: false,
                stage: 'speech',
                message: speechResult.message,
                index: speechResult.index,
                text: speechResult.text,
                detail: speechResult.detail,
                audios: speechResult.audios,
            },
        };
    }

    return {
        ok: true,
        lines,
        speechResult,
    };
}

/**
 * 根据配音 audios 生成 SRT 写入 server/tmp，并上传到 OSS（供 ffmpeg 下载列表使用）。
 * @param {{ audios: unknown[], project: string }} params
 * @returns {Promise<{ srtPath: string, srtOssUrl: string | undefined }>}
 */
async function processSubtitleSrtAndUpload({ audios, project }) {
    const srtPath = path.join(__dirname, '..', '..', 'tmp', `${project}.srt`);
    generateSrtFromAudios(audios, srtPath);
    const srtOssUrl = await uploadBufferAndGetUrl(
        fs.readFileSync(srtPath),
        `subtitle/${project}.srt`
    );
    return { srtPath, srtOssUrl };
}

/**
 * Coze 配音-素材匹配 → file-server 拉取文件 → Coze 生成 ffmpeg 命令串
 * @param {{ audios: unknown[], materialTips?: unknown[] | null, project: string, srtOssUrl?: string }} params
 */
async function processMaterialMatchDownloadAndFfmpeg({ audios, materialTips, project, srtOssUrl }) {
    let materialMatch = null;
    if (
        Array.isArray(audios) &&
        audios.length > 0 &&
        Array.isArray(materialTips) &&
        materialTips.length > 0
    ) {
        try {
            const matchResp = await callCozeMaterialMatch({
                voice_data: audios,
                image_data: materialTips,
            });
            materialMatch = JSON.parse(matchResp.bodyText).matched_data;
        } catch (err) {
            console.error('[generate] material-match failed', err.message);
            materialMatch = [];
        }
    }

    const { localPathByUrl, files, ffmpegTimeline } = buildDownloadFilesPayload(
        materialMatch,
        project
    );

    const fileServerBase = String(config.fileServerBaseUrl || '').replace(/\/$/, '');
    const srtUrl = typeof srtOssUrl === 'string' && srtOssUrl.trim() ? srtOssUrl.trim() : '';
    if (srtUrl) {
        files.push(srtUrl);
    }
    if (files.length > 0) {
        try {
            await axios.post(`${fileServerBase}/download-files`, {
                project,
                files,
            });
        } catch (err) {
            console.error('[generate] file-server download failed', err.message);
        }
    }

    let all_commands_joined = null;
    let ffmpeg_run_id = null;
    if (ffmpegTimeline.timeline && ffmpegTimeline.timeline.length > 0) {
        try {
            const ffResp = await callCozeFfmpegCommand(ffmpegTimeline);
            if (ffResp.status >= 200 && ffResp.status < 300) {
                const parsed = JSON.parse(ffResp.bodyText);
                if (Array.isArray(parsed.all_commands)) {
                    const lastCmd =
                        parsed.all_commands[parsed.all_commands.length - 1];
                    if (lastCmd != null) {
                        all_commands_joined = Buffer.from(
                            String(lastCmd),
                            'utf8'
                        ).toString('base64');
                        if (fileServerBase) {
                            try {
                                await axios.post(
                                    `${fileServerBase}/run-shell`,
                                    { script: all_commands_joined },
                                    { timeout: 620000 }
                                );
                            } catch (err) {
                                console.error(
                                    '[generate] file-server run-shell failed',
                                    err.message
                                );
                            }
                        }
                    }
                }
                if (parsed.run_id != null) {
                    ffmpeg_run_id = parsed.run_id;
                }
            }
        } catch (err) {
            console.error('[generate] Coze ffmpeg-command failed', err.message);
        }
    }

    return {
        materialMatch,
        localPathByUrl,
        project,
        files,
        ffmpegTimeline,
        all_commands_joined,
        ffmpeg_run_id,
    };
}

/**
 * POST /api/generate
 * POST /api/generate/subtitles
 */
async function handleOneClickGenerate(req, res) {
    const project = `download-${Date.now()}`;
    const { subtitles_type, rawList, voice_url, materialList } = parseOneClickBody(req.body);

    // 处理素材打标阶段
    let materialResult = null;
    try {
        materialResult = await processMaterialListTips(pool, materialList);  
    } catch (err) {
        console.error('[generate materialList test]', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'materialList 打标试验失败',
        });
    }

    // 语音合成阶段
    let speechStage = null
    try {
        speechStage = await processOneClickSpeechStage({
            rawList,
            voice_url,
        });
        if (!speechStage.ok) {
            console.error(
                '[generate] speech stage failed',
                speechStage.status,
                speechStage.body?.message,
                speechStage.body?.detail || ''
            );
            return res.status(speechStage.status).json(speechStage.body);
        }
    } catch (err) {
        console.error('[generate one-click]', err);
        const msg =
            err.message && err.message !== '[object Object]'
                ? err.message
                : '生成失败';
        return res.status(500).json({ success: false, message: msg });
    }


    // 字幕srt文件生成和上传阶段
    const { srtOssUrl } = await processSubtitleSrtAndUpload({
        audios: speechStage.speechResult.audios,
        project,
    });

    // 生成 ffmpeg 阶段：Coze 配音-素材匹配 → file-server 拉取文件 → Coze 生成 ffmpeg 命令串
    const pipeline = await processMaterialMatchDownloadAndFfmpeg({
        audios: speechStage.speechResult.audios,
        materialTips: materialResult?.materialTips,
        project,
        srtOssUrl,
    });

    return res.json({
        success: true,
        message: materialResult ? '素材打标 + 语音字幕生成完成' : '语音字幕生成完成',
        materialTips: materialResult ? materialResult.materialTips : undefined,
        stats: materialResult ? materialResult.stats : undefined,
        voice_url: speechStage.speechResult.voice_url,
        subtitles_type: subtitles_type || undefined,
        count: speechStage.speechResult.count,
        audios: speechStage.speechResult.audios,
        videos: [],
        material_match: pipeline.materialMatch,
        download_local: {
            project: pipeline.project,
            localPathByUrl: pipeline.localPathByUrl,
        },
        srt_oss_url: srtOssUrl || undefined,
        ffmpegTimeline: pipeline.ffmpegTimeline,
        all_commands_joined: pipeline.all_commands_joined,
    });
}

router.post('/generate', handleOneClickGenerate);
router.post('/generate/subtitles', handleOneClickGenerate);

module.exports = router;
module.exports.processSubtitleSrtAndUpload = processSubtitleSrtAndUpload;
module.exports.runOneClickSpeech = runOneClickSpeech;
module.exports.isValidVoiceUrl = isValidVoiceUrl;
