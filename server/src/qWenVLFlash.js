const axios = require('axios');

const DEFAULT_API_BASE =
    process.env.DASHSCOPE_API_BASE ||
    'https://dashscope.aliyuncs.com/api/v1';
const MULTIMODAL_GENERATION_PATH =
    '/services/aigc/multimodal-generation/generation';

function getApiKey(explicit) {
    const key = explicit || process.env.DASHSCOPE_API_KEY || process.env.ali_key;
    if (!key || !String(key).trim()) {
        throw new Error('缺少 DASHSCOPE_API_KEY（或 ali_key）');
    }
    return String(key).trim();
}

function extractFlashResponse(data) {
    const message = data?.output?.choices?.[0]?.message || {};
    const reasoning = String(message.reasoning_content || '').trim();
    const content = Array.isArray(message.content) ? message.content : [];
    const answer = content
        .map((item) => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (typeof item.text === 'string') return item.text;
            return '';
        })
        .join('\n')
        .trim();
    return { reasoning, answer };
}

/**
 * Qwen3-VL-Flash 多模态调用（非流式，便于服务端封装）
 * @param {object} params
 * @param {Array<{role:string, content:Array<{image?:string,text?:string}>}>} params.messages
 * @param {string} [params.model] 默认 qwen3-vl-flash
 * @param {boolean} [params.enableThinking] 是否返回思考过程
 * @param {number} [params.thinkingBudget] 思考 token 预算
 * @param {string} [params.apiKey]
 */
async function callQwenVLFlash({
    messages,
    model = 'qwen3-vl-flash',
    enableThinking = true,
    thinkingBudget = 81920,
    apiKey,
}) {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('messages 不能为空数组');
    }

    const key = getApiKey(apiKey);
    const base = DEFAULT_API_BASE.replace(/\/$/, '');
    const url = `${base}${MULTIMODAL_GENERATION_PATH}`;

    console.log('messages', JSON.stringify(messages))
    const payload = {
        model,
        input: { messages },
        parameters: {
            enable_thinking: Boolean(enableThinking),
            thinking_budget: Number(thinkingBudget),
            stream: false,
        },
    };

    const { data } = await axios.post(url, payload, {
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        timeout: 120000,
        validateStatus: () => true,
    });

    if (data?.code) {
        const msg = data.message || data.msg || JSON.stringify(data);
        throw new Error(`DashScope 错误 [${data.code}]: ${msg}`);
    }

    const { reasoning, answer } = extractFlashResponse(data);
    return { raw: data, reasoning, answer };
}

/**
 * 多图问答便捷函数（批量图片一次调用）
 * @param {object} opts
 * @param {string[]} opts.images 图片 URL 数组
 * @param {string} opts.prompt 问题
 * @param {string} [opts.apiKey]
 */
async function askImage({ images, prompt, apiKey }) {
    if (!Array.isArray(images) || images.length === 0) {
        throw new Error('images 必填，且必须是非空数组');
    }
    const normalizedImages = images
        .map((img) => String(img || '').trim())
        .filter(Boolean);
    if (normalizedImages.length === 0) {
        throw new Error('images 不能为空');
    }
    const question = String(prompt || '').trim();
    if (!question) {
        throw new Error('prompt 必填');
    }

    const messages = [
        {
            role: 'user',
            content: [
                ...normalizedImages.map((img) => ({ image: img })),
                { text: question },
            ],
        },
    ];

    return callQwenVLFlash({ messages, apiKey });
}

module.exports = {
    callQwenVLFlash,
    askImage,
    extractFlashResponse,
};