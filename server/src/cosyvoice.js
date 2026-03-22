const fs = require('fs');
const path = require('path');
const axios = require('axios');
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

class VoiceEnrollmentService {
    constructor() {
        this.apiKey = apiKey;
        this.lastRequestId = null;
    }

    async createVoice(targetModel, prefix, url) {
        try {
            const response = await axios.post(
                'https://dashscope.aliyuncs.com/api/v1/tts/voice/enrollment/create',
                {
                    target_model: targetModel,
                    prefix: prefix,
                    url: url
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            this.lastRequestId = response.headers['x-request-id'] || null;
            const voiceId = response.data.output.voice_id;
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
            const response = await axios.get(
                `https://dashscope.aliyuncs.com/api/v1/tts/voice/enrollment/query?voice_id=${voiceId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
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

    async call(text) {
        try {
            const response = await axios.post(
                'https://dashscope.aliyuncs.com/api/v1/tts/synthesize',
                {
                    model: this.model,
                    voice: this.voice,
                    input: {
                        text: text
                    },
                    parameters: {
                        format: 'mp3'
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    responseType: 'arraybuffer'
                }
            );

            this.lastRequestId = response.headers['x-request-id'] || null;
            console.log(`Speech synthesis successful. Request ID: ${this.lastRequestId}`);
            return response.data;
        } catch (error) {
            console.error(`Error during speech synthesis: ${error.message}`);
            throw error;
        }
    }

    getLastRequestId() {
        return this.lastRequestId;
    }
}

async function main() {
    console.log('--- Step 1: Creating voice enrollment ---');
    const service = new VoiceEnrollmentService();
    let voiceId;

    try {
        voiceId = await service.createVoice(
            TARGET_MODEL,
            VOICE_PREFIX,
            AUDIO_URL
        );
    } catch (e) {
        console.error(`Error during voice creation: ${e}`);
        process.exit(1);
    }

    console.log('\n--- Step 2: Polling for voice status ---');
    const maxAttempts = 30;
    const pollInterval = 10000; // 10 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const voiceInfo = await service.queryVoice(voiceId);
            const status = voiceInfo.status;
            console.log(`Attempt ${attempt + 1}/${maxAttempts}: Voice status is '${status}'`);

            if (status === 'OK') {
                console.log('Voice is ready for synthesis.');
                break;
            } else if (status === 'UNDEPLOYED') {
                console.log(`Voice processing failed with status: ${status}. Please check audio quality or contact support.`);
                throw new Error(`Voice processing failed with status: ${status}`);
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (e) {
            console.error(`Error during status polling: ${e}`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }

    console.log('\n--- Step 3: Synthesizing speech with the new voice ---');
    try {
        const synthesizer = new SpeechSynthesizer(TARGET_MODEL, voiceId);
        const textToSynthesize = 'How is the weather today?';

        const audioData = await synthesizer.call(textToSynthesize);

        const outputFile = 'my_custom_voice_output.mp3';
        fs.writeFileSync(outputFile, audioData);
        console.log(`Audio saved to ${outputFile}`);
    } catch (e) {
        console.error(`Error during speech synthesis: ${e}`);
        process.exit(1);
    }
}

// 导出模块
module.exports = {
    VoiceEnrollmentService,
    SpeechSynthesizer,
    main
};

// 如果直接运行此文件，则执行main函数
if (require.main === module) {
    main();
}
