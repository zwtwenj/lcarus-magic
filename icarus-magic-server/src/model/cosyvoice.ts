import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import axios from 'axios';
import * as crypto from 'crypto';

// 类型声明
export interface WebSocketMessage {
  header: {
    action?: string;
    task_id?: string;
    streaming?: string;
    event?: string;
    error_message?: string;
    error_code?: string;
    attributes?: {
      request_uuid?: string;
    };
  };
  payload: {
    task_group?: string;
    task?: string;
    function?: string;
    model?: string;
    parameters?: any;
    input?: {
      text?: string;
    };
  };
}

export interface SynthesisOptions {
  url?: string;
  voiceId?: string;
  parameters?: Record<string, any>;
}

export interface SynthesisResult {
  audio: Buffer;
  format: string;
  voiceId: string;
}

export interface VoiceEnrollmentResponse {
  status: string;
  message?: string;
}

// 常量定义
const TARGET_MODEL = 'cosyvoice-v3-flash';
const TTS_CUSTOMIZATION_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization';
const WS_INFERENCE_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

// 1. VoiceEnrollmentService 保持不变（负责处理 URL -> VoiceID 的逻辑）
export class VoiceEnrollmentService {
  private apiKey: string;
  private lastRequestId: string | null = null;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get('ali_key') || '';
    if (!this.apiKey) {
      throw new Error('ali_key environment variable not set.');
    }
  }

  async createVoice(targetModel: string, prefix: string, url: string): Promise<string> {
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

      this.lastRequestId = response.headers['x-request-id'] || response.data?.request_id || null;
      const voiceId = response.data?.output?.voice_id;
      if (!voiceId) {
        throw new Error('Voice create response missing output.voice_id: ' + JSON.stringify(response.data));
      }
      console.log(`Voice enrollment submitted successfully. Request ID: ${this.lastRequestId}`);
      console.log(`Generated Voice ID: ${voiceId}`);
      return voiceId;
    } catch (error: any) {
      console.error(`Error during voice creation: ${error.message}`);
      throw error;
    }
  }

  async queryVoice(voiceId: string): Promise<VoiceEnrollmentResponse> {
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
    } catch (error: any) {
      console.error(`Error during status polling: ${error.message}`);
      throw error;
    }
  }

  getLastRequestId() {
    return this.lastRequestId;
  }
}

// 2. SpeechSynthesizer 保持不变（负责最终的 TTS 合成）
export class SpeechSynthesizer {
  private apiKey: string;
  private model: string;
  private voice: string;
  private lastRequestId: string | null = null;

  constructor(configService: ConfigService, model: string, voice: string) {
    this.apiKey = configService.get('ali_key') || '';
    if (!this.apiKey) {
      throw new Error('ali_key environment variable not set.');
    }
    this.model = model;
    this.voice = voice;
  }

  call(text: string, parameters: Record<string, any> = {}): Promise<Buffer | null> {
    const taskId = crypto.randomUUID().replace(/-/g, '');
    const audioChunks: Buffer[] = [];
    const WS_TIMEOUT_MS = 180000;

    return new Promise<Buffer | null>((resolve, reject) => {
      let settled = false;
      const finish = (err: Error | null, buf: Buffer | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          ws.close();
        } catch (_) { /* ignore */ }
        if (err) {
          console.error(`Error during speech synthesis: ${err.message || err}`);
          reject(err);
        } else {
          console.log(`Speech synthesis successful. Request ID: ${this.lastRequestId}`);
          resolve(buf);
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

      ws.on('error', (e: any) => {
        finish(e instanceof Error ? e : new Error(String(e)), null);
      });

      ws.on('open', () => {
        // 核心：将传入的 parameters 与默认参数合并
        const params: Record<string, any> = {
          text_type: 'PlainText',
          voice: this.voice,
          format: 'mp3',
          sample_rate: 22050,
          volume: 50,
          rate: 1,
          pitch: 1,
          language_hints: ['zh'],
        };

        // 深度合并用户传入的参数，覆盖默认值
        Object.assign(params, parameters);

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
              parameters: params,
              input: {},
            },
          })
        );
      });

      ws.on('message', (data: any, isBinary: boolean) => {
        if (isBinary) {
          audioChunks.push(Buffer.from(data));
          return;
        }
        let msg: WebSocketMessage;
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
              payload: {
                input: {},
              },
            })
          );
          return;
        }
        if (ev === 'task-finished') {
          this.lastRequestId =
            msg.header &&
            msg.header.attributes &&
            msg.header.attributes.request_uuid ||
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
          finish(new Error(errMsg), null);
        }
      });
    });
  }

  getLastRequestId() {
    return this.lastRequestId;
  }
}

// 3. 新增：通用的合成函数（支持 URL 和 VoiceId）
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
 * 通用语音合成函数
 * @param configService - NestJS ConfigService
 * @param text - 要合成的文本
 * @param options - 配置选项
 * @param options.url - (可选) 参考音频 URL，用于创建自定义音色
 * @param options.voiceId - (可选) 已有的音色 ID (百炼平台 ID)，如果提供了此参数，将忽略 url
 * @param options.parameters - (可选) 合成参数 { rate: 1.2, emotion: 'happy', ... }
 * @returns 包含音频 Buffer 和 VoiceId 的对象
 */
export async function synthesizeSpeech(
  configService: ConfigService,
  text: string,
  options: SynthesisOptions
): Promise<SynthesisResult> {
  console.log('Synthesizing speech for text:', text);
  console.log('Options:', options);
  
  const { url, voiceId: providedVoiceId, parameters = {} } = options;
  let finalVoiceId: string;

  // 逻辑分支：决定使用哪个 VoiceId
  if (providedVoiceId) {
    // 情况 1: 用户直接传了 VoiceId，直接使用
    finalVoiceId = providedVoiceId;
    console.log(`Using provided Voice ID: ${finalVoiceId}`);
  } else if (url) {
    // 情况 2: 用户传了 URL，需要先创建音色
    console.log(`Creating voice from URL: ${url}`);
    const enroll = new VoiceEnrollmentService(configService);
    const prefix = randomVoicePrefix();
    
    // 1. 创建音色
    const tempVoiceId = await enroll.createVoice(TARGET_MODEL, prefix, url);
    
    // 2. 等待音色就绪
    const deadline = Date.now() + ENROLL_POLL_TIMEOUT_MS;
    let output: VoiceEnrollmentResponse | undefined;
    while (Date.now() < deadline) {
      output = await enroll.queryVoice(tempVoiceId);
      const status = output?.status;
      if (status === 'OK') {
        break;
      }
      if (status === 'UNDEPLOYED') {
        throw new Error(output.message || 'Voice enrollment failed (UNDEPLOYED)');
      }
      await new Promise((r) => setTimeout(r, ENROLL_POLL_INTERVAL_MS));
    }
    if (!output || output.status !== 'OK') {
      throw new Error('Voice enrollment timed out');
    }
    finalVoiceId = tempVoiceId;
  } else {
    throw new Error('Either "url" or "voiceId" must be provided.');
  }

  // 无论哪种情况，现在都有了 finalVoiceId，进行合成
  const synth = new SpeechSynthesizer(configService, TARGET_MODEL, finalVoiceId);
  const audio = await synth.call(text, parameters); // 透传 parameters

  return {
    audio: audio ? (Buffer.isBuffer(audio) ? audio : Buffer.from(audio)) : Buffer.from([]),
    format: 'mp3',
    voiceId: finalVoiceId,
  };
}