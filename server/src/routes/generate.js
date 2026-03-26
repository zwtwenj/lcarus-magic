const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { pool } = require('../db');
const { uploadBufferAndGetUrl } = require('../oss');
const { synthesizeFromUrlAndText } = require('../cosyvoice');
const { askImage } = require('../qWenVLFlash');

const router = express.Router();

/** Remotion POST /api/render-video 单次 body 模板（字幕样式 id 在顶层 id，文案在 inputProps.TEXT1） */
const REMOTION_RENDER_BODY_TEMPLATE = {
    width: 1000,
    height: 1000,
    durationInFrames: 60,
    transparent: true,
    fps: 30,
};

function toDurationInFrames(durationSeconds) {
    const fps = REMOTION_RENDER_BODY_TEMPLATE.fps;
    const fallback = REMOTION_RENDER_BODY_TEMPLATE.durationInFrames;
    if (
        typeof durationSeconds !== 'number' ||
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0
    ) {
        return fallback;
    }
    return Math.max(1, Math.round(durationSeconds * fps));
}

function subtitlesOutputDir() {
    return path.join(__dirname, '..', '..', 'generated', 'subtitles');
}

/**
 * @param {string} subtitlesType AE 样式 id（如 guodong）
 * @param {string} text 单条字幕
 * @param {number|null|undefined} durationSeconds 当前字幕对应语音时长（秒）
 */
function buildRemotionSubtitleBody(subtitlesType, text, durationSeconds) {
    return {
        ...REMOTION_RENDER_BODY_TEMPLATE,
        durationInFrames: toDurationInFrames(durationSeconds),
        id: subtitlesType,
        inputProps: { TEXT1: text },
        useGPU: false,
    };
}

/**
 * @param {string} remotionBaseUrl 无尾斜杠
 * @param {object} body Remotion 请求体
 * @returns {Promise<{ data: Buffer, status: number }>}
 */
async function postRemotionRender(remotionBaseUrl, body) {
    const url = `${remotionBaseUrl}/api/render-video`;
    const resp = await axios.post(url, body, {
        responseType: 'arraybuffer',
        timeout: 120000,
        validateStatus: () => true,
    });
    return { data: Buffer.from(resp.data), status: resp.status };
}

function parseRemotionError(buffer) {
    try {
        const errJson = JSON.parse(buffer.toString('utf8'));
        return errJson.details || errJson.error || null;
    } catch {
        return null;
    }
}

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

/**
 * 一键生成字幕视频（Remotion）：每条字幕按对应语音时长 durationInFrames 渲染。
 * @param {{ subtitles_type: string, lines: string[], audios?: Array<{ durationSeconds?: number | null }> }} params
 */
async function runOneClickSubtitleVideos({ subtitles_type, lines, audios = [] }) {
    const base = config.remotionRenderUrl.replace(/\/$/, '');
    const outDir = subtitlesOutputDir();
    fs.mkdirSync(outDir, { recursive: true });

    const videos = [];
    const subtitles = lines.map((text, index) => {
        const durationSeconds = audios[index]?.durationSeconds ?? null;
        return {
            index,
            text,
            durationSeconds,
            fps: REMOTION_RENDER_BODY_TEMPLATE.fps,
            durationInFrames: toDurationInFrames(durationSeconds),
        };
    });

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        const durationSeconds = audios[i]?.durationSeconds ?? null;
        const body = buildRemotionSubtitleBody(
            subtitles_type,
            text,
            durationSeconds
        );
        const { data, status } = await postRemotionRender(base, body);
        if (status >= 400) {
            const detail = parseRemotionError(data) || String(status);
            return {
                ok: false,
                status: 502,
                message: 'Remotion 渲染失败',
                index: i,
                text,
                detail,
                videos,
                subtitles,
            };
        }
        const fileName = `sub-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.mp4`;
        const filePath = path.join(outDir, fileName);
        fs.writeFileSync(filePath, data);
        videos.push({
            index: i,
            text,
            fileName,
            url: `/api/static/generated/subtitles/${fileName}`,
        });
    }

    return {
        ok: true,
        subtitles_type,
        subtitles,
        count: videos.length,
        videos,
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
 * POST /api/generate
 * POST /api/generate/subtitles
 */
async function handleOneClickGenerate(req, res) {
    const { subtitles_type, rawList, voice_url, materialList } = parseOneClickBody(req.body);

    const materialUrls = normalizeMaterialUrls(materialList);
    if (materialUrls.length > 0) {
        try {
            const uniqueUrls = [...new Set(materialUrls)];
            const [rows] = await pool.query(
                'SELECT material_url, tip FROM material_tip WHERE material_url IN (?)',
                [uniqueUrls]
            );
            const existingMap = new Map(
                (rows || []).map((r) => [
                    String(r.material_url),
                    {
                        material_url: r.material_url,
                        tip: r.tip ?? null,
                        source: 'db',
                    },
                ])
            );
            const images = uniqueUrls.filter((url) => !existingMap.has(url));
            const PROMPT = "帮我对你收到的图片数组进行打标，输出数组json格式为[{url: 字符串, tip: []}]，假设你当前在处理图片数组下标0的图片，url中存储这张图片的地址，tip为标签数组例如['清晨', '太阳']";

            const generated = [];
            if (images.length > 0) {
                const out = await askImage({ images, prompt: PROMPT });
                console.log(out)
            }

            return res.json({
                success: true,
                message: 'materialList 打标试验完成',
                materialTips: [...existingMap.values(), ...generated],
                stats: {
                    total: uniqueUrls.length,
                    fromDb: existingMap.size,
                    calledQwenVlFlash: images.length,
                },
            });
        } catch (err) {
            console.error('[generate materialList test]', err);
            return res.status(500).json({
                success: false,
                message: err.message || 'materialList 打标试验失败',
            });
        }
    }

    // if (!Array.isArray(rawList)) {
    //     return res.status(400).json({
    //         message: '缺少字幕列表：subtitles 或 subtitle_segments（须为字符串数组）',
    //     });
    // }

    // const lines = rawList
    //     .map((s) => (s == null ? '' : String(s).trim()))
    //     .filter(Boolean);

    // if (lines.length === 0) {
    //     return res.status(400).json({ message: '字幕列表无有效条目' });
    // }

    // if (!isValidVoiceUrl(voice_url)) {
    //     return res.status(400).json({
    //         message: '缺少有效的 voice_url（参考音公网 HTTPS/HTTP 地址）',
    //     });
    // }

    // try {
    //     const speechResult = await runOneClickSpeech({
    //         voice_url,
    //         lines,
    //     });

    //     if (!speechResult.ok) {
    //         return res.status(speechResult.status).json({
    //             message: speechResult.message,
    //             index: speechResult.index,
    //             text: speechResult.text,
    //             detail: speechResult.detail,
    //             audios: speechResult.audios,
    //         });
    //     }

    //     let videos = [];
    //     let subtitles = [];
    //     if (subtitles_type) {
    //         const videoResult = await runOneClickSubtitleVideos({
    //             subtitles_type,
    //             lines,
    //             audios: speechResult.audios,
    //         });
    //         if (!videoResult.ok) {
    //             return res.status(videoResult.status).json({
    //                 message: videoResult.message,
    //                 index: videoResult.index,
    //                 text: videoResult.text,
    //                 detail: videoResult.detail,
    //                 videos: videoResult.videos,
    //                 subtitles: videoResult.subtitles,
    //                 audios: speechResult.audios,
    //             });
    //         }
    //         videos = videoResult.videos;
    //         subtitles = videoResult.subtitles;
    //     }

    //     return res.json({
    //         success: true,
    //         voice_url: speechResult.voice_url,
    //         subtitles_type: subtitles_type || undefined,
    //         count: speechResult.count,
    //         audios: speechResult.audios,
    //         subtitles: subtitles || undefined,
    //         videos,
    //     });
    // } catch (err) {
    //     console.error('[generate one-click]', err);
    //     const msg =
    //         err.message && err.message !== '[object Object]'
    //             ? err.message
    //             : '生成失败';
    //     return res.status(500).json({ message: msg });
    // }
}

router.post('/generate', handleOneClickGenerate);
router.post('/generate/subtitles', handleOneClickGenerate);

module.exports = router;
module.exports.buildRemotionSubtitleBody = buildRemotionSubtitleBody;
module.exports.runOneClickSubtitleVideos = runOneClickSubtitleVideos;
module.exports.runOneClickSpeech = runOneClickSpeech;
module.exports.isValidVoiceUrl = isValidVoiceUrl;
