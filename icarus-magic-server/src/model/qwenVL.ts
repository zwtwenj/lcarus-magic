import axios from 'axios';
import { ConfigService } from '@nestjs/config';

const DEFAULT_API_BASE =
  process.env.DASHSCOPE_API_BASE ||
  'https://dashscope.aliyuncs.com/api/v1';

const MULTIMODAL_GENERATION_PATH =
  '/services/aigc/multimodal-generation/generation';

const DEFAULT_TAG_PROMPT =
  '请用中文为该图片生成用于检索的标签：3～8 个关键词或短语，用英文逗号分隔，不要编号、不要解释、不要其它文字。';

interface MessageContentItem {
  image?: string;
  text?: string;
}

interface Message {
  role: string;
  content: Array<MessageContentItem | string>;
}

interface CallQwenVLParams {
  messages: Message[];
  model?: string;
  apiKey?: string;
}

interface QwenVLResponse {
  raw: any;
  text: string;
}

interface TagImageParams {
  image: string;
  prompt?: string;
  apiKey?: string;
}

interface TagImageResponse {
  raw: any;
  text: string;
  tags: string[];
}

function getApiKey(configService: ConfigService, explicit?: string): string {
  const key = explicit || configService.get('ali_key');
  if (!key || !String(key).trim()) {
    throw new Error(
      '缺少 DASHSCOPE_API_KEY（百炼 / DashScope API Key，可在环境变量中配置）'
    );
  }
  return String(key).trim();
}

function extractTextFromResponse(data: any): string {
  const out = data?.output;
  if (!out) {
    return '';
  }
  const choice = out.choices?.[0];
  const content = choice?.message?.content;
  if (Array.isArray(content)) {
    const parts = content.map((item: any) => {
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

async function callQwenVLMax(
  configService: ConfigService,
  { messages, model = 'qwen-vl-max', apiKey }: CallQwenVLParams
): Promise<QwenVLResponse> {
  const key = getApiKey(configService, apiKey);
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

async function tagImage(
  configService: ConfigService,
  { image, prompt, apiKey }: TagImageParams
): Promise<TagImageResponse> {
  if (!image || typeof image !== 'string') {
    throw new Error('tagImage 需要参数 image（URL 或 base64 data URL）');
  }

  const userPrompt = (prompt && String(prompt).trim()) || DEFAULT_TAG_PROMPT;

  const messages: Message[] = [
    {
      role: 'user',
      content: [{ image: image.trim() }, { text: userPrompt }],
    },
  ];

  const { raw, text } = await callQwenVLMax(configService, { messages, apiKey });

  const tags = text
    ? text
        .split(/[,，、;；\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return { raw, text, tags };
}

export { callQwenVLMax, tagImage, extractTextFromResponse, DEFAULT_TAG_PROMPT };
