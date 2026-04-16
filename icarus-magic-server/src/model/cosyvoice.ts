import crypto from 'crypto';
import axios from 'axios';
import WebSocket from 'ws';
import { ConfigService } from '@nestjs/config';

const TARGET_MODEL = 'cosyvoice-v3.5-flash';

const TTS_CUSTOMIZATION_URL =
    'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization';

const WS_INFERENCE_URL =
    'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

interface VoiceEnrollmentOutput {
    voice_id?: string;
    status?: string;
    message?: string;
}

interface CreateVoiceInput {
    model?: string;
    input?: {
        action?: string;
        target_model?: string;
        prefix?: string;
        url?: string;
        voice_id?: string;
        language_hints?: string[];
    };
}

export class VoiceEnrollmentService {
    private apiKey: string;
    private lastRequestId: string | null = null;

    constructor(configService: ConfigService) {
        this.apiKey = configService.get<string>('ali_key') || '';
        if (!this.apiKey) {
            throw new Error('ali_key environment variable not set.');
        }
    }

    async createVoice(targetModel: string, prefix: string, url: string): Promise<string> {
        try {
            const response = await axios.post<{ output?: VoiceEnrollmentOutput; request_id?: string }>(
                TTS_CUSTOMIZATION_URL,
                {
                    model: 'voice-enrollment',
                    input: {
                        action: 'create_voice',
                        target_model: targetModel,
                        prefix,
                        url,
                        language_hints: ['zh'],
                    } as CreateVoiceInput['input'],
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
            if (axios.isAxiosError(error)) {
                console.error(`Error during voice creation: ${error.message}`);
            }
            throw error;
        }
    }

    async queryVoice(voiceId: string): Promise<VoiceEnrollmentOutput> {
        try {
            const response = await axios.post<{ output: VoiceEnrollmentOutput }>(
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
            if (axios.isAxiosError(error)) {
                console.error(`Error during status polling: ${error.message}`);
            }
            throw error;
        }
    }

    getLastRequestId(): string | null {
        return this.lastRequestId;
    }
}

interface WebSocketMessage {
    header?: {
        action?: string;
        task_id?: string;
        event?: string;
        error_message?: string;
        error_code?: string;
        attributes?: {
            request_uuid?: string;
        };
        streaming?: string;
    };
    payload?: {
        task_group?: string;
        task?: string;
        function?: string;
        model?: string;
        parameters?: {
            text_type?: string;
            voice?: string;
            format?: string;
            sample_rate?: number;
            volume?: number;
            rate?: number;
            pitch?: number;
            language_hints?: string[];
        };
        input?: {
            text?: string;
        };
    };
}

export class SpeechSynthesizer {
    private apiKey: string;
    private model: string;
    private voice: string;
    private lastRequestId: string | null = null;

    constructor(configService: ConfigService, model: string, voice: string) {
        this.apiKey = configService.get<string>('ali_key') || '';
        if (!this.apiKey) {
            throw new Error('ali_key environment variable not set.');
        }
        this.model = model;
        this.voice = voice;
    }

    call(
        text: string, 
        options?: {
            volume?: number;
            rate?: number;
            pitch?: number;
            role?: string;
            emotion?: string;
        }
    ): Promise<Buffer> {
        const taskId = crypto.randomUUID().replace(/-/g, '');
        const audioChunks: Buffer[] = [];
        const WS_TIMEOUT_MS = 180000;

        return new Promise((resolve, reject) => {
            let settled = false;

            const finish = (err: Error | null, buf: Buffer | null) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try {
                    ws.close();
                } catch (_) {
                    // ignore
                }
                if (err) {
                    console.error(`Error during speech synthesis: ${err.message || err}`);
                }
                if (err) {
                    reject(err);
                } else {
                    resolve(buf!);
                }
            };

            const ws = new WebSocket(WS_INFERENCE_URL, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });

            const timer = setTimeout(() => {
                finish(new Error('Speech synthesis WebSocket timeout'), null);
            }, WS_TIMEOUT_MS);

            ws.on('error', (e) => {
                finish(e instanceof Error ? e : new Error(String(e)), null);
            });

            ws.on('open', () => {
                const parameters: any = {
                    text_type: 'PlainText',
                    voice: this.voice,
                    format: 'mp3',
                    sample_rate: 22050,
                    volume: 50,
                    rate: 1,
                    pitch: 1,
                    language_hints: ['zh'],
                };

                if (options) {
                    if (options.volume !== undefined) parameters.volume = options.volume;
                    if (options.rate !== undefined) parameters.rate = options.rate;
                    if (options.pitch !== undefined) parameters.pitch = options.pitch;
                    if (options.role) parameters.role = options.role;
                    if (options.emotion) parameters.emotion = options.emotion;
                }

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
                            parameters,
                            input: {},
                        },
                    })
                );
            });

            ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
                if (isBinary) {
                    audioChunks.push(Buffer.from(data as Buffer));
                    return;
                }

                let msg: WebSocketMessage;
                try {
                    msg = JSON.parse(data.toString());
                } catch {
                    return;
                }

                const ev = msg.header?.event;

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
                        msg.header?.attributes?.request_uuid || null;

                    const buf = Buffer.concat(audioChunks);
                    finish(null, buf);
                    return;
                }

                if (ev === 'task-failed') {
                    const errMsg =
                        msg.header?.error_message ||
                        msg.header?.error_code ||
                        'Speech synthesis task-failed';

                    finish(new Error(errMsg), null);
                }
            });
        });
    }

    getLastRequestId(): string | null {
        return this.lastRequestId;
    }
}

const ENROLL_POLL_INTERVAL_MS = 2000;
const ENROLL_POLL_TIMEOUT_MS = 120000;

function randomVoicePrefix(): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let s = '';
    for (let i = 0; i < 8; i += 1) {
        s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return s;
}

export interface SynthesizeResult {
    audio: Buffer;
    format: string;
    voiceId: string;
}

export async function synthesizeFromUrlAndText(
    configService: ConfigService, 
    url: string, 
    text: string,
    options?: {
        volume?: number;
        rate?: number;
        pitch?: number;
        role?: string;
        emotion?: string;
    }
): Promise<SynthesizeResult> {
    const u = typeof url === 'string' ? url.trim() : '';
    const t = typeof text === 'string' ? text.trim() : '';

    if (!u) {
        throw new Error('url is required');
    }
    if (!t) {
        throw new Error('text is required');
    }

    const enroll = new VoiceEnrollmentService(configService);
    const prefix = randomVoicePrefix();
    const voiceId = await enroll.createVoice(TARGET_MODEL, prefix, u);

    const deadline = Date.now() + ENROLL_POLL_TIMEOUT_MS;
    let output: VoiceEnrollmentOutput | undefined;

    while (Date.now() < deadline) {
        output = await enroll.queryVoice(voiceId);
        const status = output?.status;

        if (status === 'OK') {
            break;
        }
        if (status === 'UNDEPLOYED') {
            throw new Error(
                output?.message || 'Voice enrollment failed (UNDEPLOYED)'
            );
        }
        await new Promise<void>((r) => setTimeout(r, ENROLL_POLL_INTERVAL_MS));
    }

    if (!output || output.status !== 'OK') {
        throw new Error('Voice enrollment timed out');
    }

    const synth = new SpeechSynthesizer(configService, TARGET_MODEL, voiceId);
    const audio = await synth.call(t, options);

    return {
        audio: Buffer.isBuffer(audio) ? audio : Buffer.from(audio),
        format: 'mp3',
        voiceId,
    };
}
