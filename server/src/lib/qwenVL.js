const axios = require('axios');

/**
 * 中国大陆默认；国际站可设 DASHSCOPE_API_BASE=https://dashscope-intl.aliyuncs.com/api/v1
 */
const DEFAULT_API_BASE =
    process.env.DASHSCOPE_API_BASE ||
    'https://dashscope.aliyuncs.com/api/v1';

const MULTIMODAL_GENERATION_PATH =
    '/services/aigc/multimodal-generation/generation';

const DEFAULT_TAG_PROMPT =
    '请用中文为该图片生成用于检索的标签：3～8 个关键词或短语，用英文逗号分隔，不要编号、不要解释、不要其它文字。';

function getApiKey(explicit) {
    const key = explicit || process.env.DASHSCOPE_API_KEY;
    if (!key || !String(key).trim()) {
        throw new Error(
            '缺少 DASHSCOPE_API_KEY（百炼 / DashScope API Key，可在环境变量中配置）'
        );
    }
    return String(key).trim();
}

/**
 * 解析 DashScope MultiModalConversation 风格返回
 * @param {object} data
 * @returns {string}
 */
function extractTextFromResponse(data) {
    const out = data?.output;
    if (!out) {
        return '';
    }
    const choice = out.choices?.[0];
    const content = choice?.message?.content;
    if (Array.isArray(content)) {
        const parts = content.map((item) => {
            if (item == null) return '';
            if (typeof item === 'string') return item;
            if (typeof item.text === 'string') return item.text;
            return '';
        });
        return parts.join('\n').trim();
    }
    if (typeof content === 'string') {
        return content.trim();
    }
    if (typeof out.text === 'string') {
        return out.text.trim();
    }
    return '';
}

/**
 * 调用 qwen-vl-max（多模态对话，与 Python dashscope.MultiModalConversation 对应）
 *
 * @param {object} params
 * @param {Array<{role: string, content: Array<{image?: string, text?: string}>}>} params.messages
 * @param {string} [params.model] 默认 qwen-vl-max
 * @param {string} [params.apiKey]
 * @returns {Promise<{ raw: object, text: string }>}
 */
async function callQwenVLMax({ messages, model = 'qwen-vl-max', apiKey }) {
    const key = getApiKey(apiKey);
    const base = DEFAULT_API_BASE.replace(/\/$/, '');
    const url = `${base}${MULTIMODAL_GENERATION_PATH}`;

    const { data } = await axios.post(
        url,
        {
            model,
            input: { messages },
        },
        {
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            timeout: 120000,
            validateStatus: () => true,
        }
    );

    if (data?.code) {
        const msg = data.message || data.msg || JSON.stringify(data);
        throw new Error(`DashScope 错误 [${data.code}]: ${msg}`);
    }

    const text = extractTextFromResponse(data);
    return { raw: data, text };
}

/**
 * 图片自动打标（单张）
 *
 * @param {object} opts
 * @param {string} opts.image 图片公网 HTTPS URL，或 data URL（如 data:image/jpeg;base64,...）
 * @param {string} [opts.prompt] 自定义指令；默认生成逗号分隔标签
 * @param {string} [opts.apiKey]
 * @returns {Promise<{ raw: object, text: string, tags: string[] }>}
 */
async function tagImage({ image, prompt, apiKey }) {
    if (!image || typeof image !== 'string') {
        throw new Error('tagImage 需要参数 image（URL 或 base64 data URL）');
    }

    const userPrompt = (prompt && String(prompt).trim()) || DEFAULT_TAG_PROMPT;

    const messages = [
        {
            role: 'user',
            content: [{ image: image.trim() }, { text: userPrompt }],
        },
    ];

    const { raw, text } = await callQwenVLMax({ messages, apiKey });

    const tags = text
        ? text
              .split(/[,，、;；\n]/)
              .map((s) => s.trim())
              .filter(Boolean)
        : [];

    return { raw, text, tags };
}

module.exports = {
    callQwenVLMax,
    tagImage,
    extractTextFromResponse,
    DEFAULT_TAG_PROMPT,
};
