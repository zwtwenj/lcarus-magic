const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const dotenv = require('dotenv');

// 加载.env文件
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 获取API密钥
const apiKey = process.env.ali_key;
if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY environment variable not set.');
}

const TARGET_MODEL = 'cosyvoice-v3.5-flash';
const VOICE_PREFIX = 'myvoice';
// Public network accessible audio URL. Please replace it with your own.
const AUDIO_URL = 'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/cosyvoice/cosyvoice-zeroshot-sample.wav';

/** 中国大陆；国际站密钥请设 DASHSCOPE_TTS_CUSTOMIZATION_URL=https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/customization */
const TTS_CUSTOMIZATION_URL =
    process.env.DASHSCOPE_TTS_CUSTOMIZATION_URL ||
    'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization';

/**
 * CosyVoice 合成仅支持 WebSocket（/api/v1/tts/synthesize 已不可用）。
 * 国际站密钥请与 HTTP 一致同时配置：
 * DASHSCOPE_WEBSOCKET_URL=wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference
 */
const WS_INFERENCE_URL =
    process.env.DASHSCOPE_WEBSOCKET_URL ||
    'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

class VoiceEnrollmentService {
    constructor() {
        this.apiKey = apiKey;
        this.lastRequestId = null;
    }

    async createVoice(targetModel, prefix, url) {
        try {
            const response = await axios.post(
                TTS_CUSTOMIZATION_URL,
                {
                    model: 'voice-enrollment',
                    input: {
                        action: 'create_voice',
                        target_model: targetModel,
                        prefix,
                        url,
                        language_hints: ['zh'],
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );

            this.lastRequestId =
                response.headers['x-request-id'] ||
                response.data?.request_id ||
                null;
            const voiceId = response.data?.output?.voice_id;
            if (!voiceId) {
                throw new Error(
                    'Voice create response missing output.voice_id: ' +
                        JSON.stringify(response.data)
                );
            }
            console.log(`Voice enrollment submitted successfully. Request ID: ${this.lastRequestId}`);
            console.log(`Generated Voice ID: ${voiceId}`);
            return voiceId;
        } catch (error) {
            console.error(`Error during voice creation: ${error.message}`);
            throw error;
        }
    }

    async queryVoice(voiceId) {
        try {
            const response = await axios.post(
                TTS_CUSTOMIZATION_URL,
                {
                    model: 'voice-enrollment',
                    input: {
                        action: 'query_voice',
                        voice_id: voiceId,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );
            return response.data.output;
        } catch (error) {
            console.error(`Error during status polling: ${error.message}`);
            throw error;
        }
    }

    getLastRequestId() {
        return this.lastRequestId;
    }
}

class SpeechSynthesizer {
    constructor(model, voice) {
        this.apiKey = apiKey;
        this.model = model;
        this.voice = voice;
        this.lastRequestId = null;
    }

    /**
     * CosyVoice 走 WebSocket：run-task → task-started → continue-task → finish-task → 收二进制音频。
     * @see https://www.alibabacloud.com/help/en/model-studio/cosyvoice-websocket-api
     */
    call(text) {
        const taskId = crypto.randomUUID().replace(/-/g, '');
        const audioChunks = [];
        const WS_TIMEOUT_MS = 180000;

        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (err, buf) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try {
                    ws.close();
                } catch (_) {
                    /* ignore */
                }
                if (err) {
                    console.error(`Error during speech synthesis: ${err.message || err}`);
                    reject(err);
                } else {
                    console.log(
                        `Speech synthesis successful. Request ID: ${this.lastRequestId}`
                    );
                    resolve(buf);
                }
            };

            const ws = new WebSocket(WS_INFERENCE_URL, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });

            const timer = setTimeout(() => {
                finish(new Error('Speech synthesis WebSocket timeout'));
            }, WS_TIMEOUT_MS);

            ws.on('error', (e) => {
                finish(e instanceof Error ? e : new Error(String(e)));
            });

            ws.on('open', () => {
                ws.send(
                    JSON.stringify({
                        header: {
                            action: 'run-task',
                            task_id: taskId,
                            streaming: 'duplex',
                        },
                        payload: {
                            task_group: 'audio',
                            task: 'tts',
                            function: 'SpeechSynthesizer',
                            model: this.model,
                            parameters: {
                                text_type: 'PlainText',
                                voice: this.voice,
                                format: 'mp3',
                                sample_rate: 22050,
                                volume: 50,
                                rate: 1,
                                pitch: 1,
                                language_hints: ['zh'],
                            },
                            input: {},
                        },
                    })
                );
            });

            ws.on('message', (data, isBinary) => {
                if (isBinary) {
                    audioChunks.push(Buffer.from(data));
                    return;
                }
                let msg;
                try {
                    msg = JSON.parse(data.toString());
                } catch {
                    return;
                }
                const ev = msg.header && msg.header.event;
                if (ev === 'task-started') {
                    ws.send(
                        JSON.stringify({
                            header: {
                                action: 'continue-task',
                                task_id: taskId,
                                streaming: 'duplex',
                            },
                            payload: {
                                input: { text },
                            },
                        })
                    );
                    ws.send(
                        JSON.stringify({
                            header: {
                                action: 'finish-task',
                                task_id: taskId,
                                streaming: 'duplex',
                            },
                            payload: { input: {} },
                        })
                    );
                    return;
                }
                if (ev === 'task-finished') {
                    this.lastRequestId =
                        (msg.header &&
                            msg.header.attributes &&
                            msg.header.attributes.request_uuid) ||
                        null;
                    const buf = Buffer.concat(audioChunks);
                    finish(null, buf);
                    return;
                }
                if (ev === 'task-failed') {
                    const errMsg =
                        (msg.header && msg.header.error_message) ||
                        (msg.header && msg.header.error_code) ||
                        'Speech synthesis task-failed';
                    finish(new Error(errMsg));
                }
            });
        });
    }

    getLastRequestId() {
        return this.lastRequestId;
    }
}

const ENROLL_POLL_INTERVAL_MS = 2000;
const ENROLL_POLL_TIMEOUT_MS = 120000;

function randomVoicePrefix() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let s = '';
    for (let i = 0; i < 8; i += 1) {
        s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return s;
}

/**
 * 使用公网可访问的参考音频 URL 复刻音色并合成文本语音（先 enrollment，再 synthesize）。
 * @param {string} url 参考音频 URL（如 wav、mp3 等，需符合百炼声音复刻对格式与时长的要求）
 * @param {string} text 待合成文本
 * @returns {Promise<{ audio: Buffer, format: string, voiceId: string }>}
 */
async function synthesizeFromUrlAndText(url, text) {
    const u = typeof url === 'string' ? url.trim() : '';
    const t = typeof text === 'string' ? text.trim() : '';
    if (!u) {
        throw new Error('url is required');
    }
    if (!t) {
        throw new Error('text is required');
    }

    const enroll = new VoiceEnrollmentService();
    const prefix = randomVoicePrefix();
    const voiceId = await enroll.createVoice(TARGET_MODEL, prefix, u);

    const deadline = Date.now() + ENROLL_POLL_TIMEOUT_MS;
    let output;
    while (Date.now() < deadline) {
        output = await enroll.queryVoice(voiceId);
        const status = output && output.status;
        if (status === 'OK') {
            break;
        }
        if (status === 'UNDEPLOYED') {
            throw new Error(
                output.message || 'Voice enrollment failed (UNDEPLOYED)'
            );
        }
        await new Promise((r) => setTimeout(r, ENROLL_POLL_INTERVAL_MS));
    }
    if (!output || output.status !== 'OK') {
        throw new Error('Voice enrollment timed out');
    }

    const synth = new SpeechSynthesizer(TARGET_MODEL, voiceId);
    const audio = await synth.call(t);
    return {
        audio: Buffer.isBuffer(audio) ? audio : Buffer.from(audio),
        format: 'mp3',
        voiceId,
    };
}

// 导出模块
module.exports = {
    VoiceEnrollmentService,
    SpeechSynthesizer,
    synthesizeFromUrlAndText,
};