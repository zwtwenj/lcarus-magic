import { ConfigService } from '@nestjs/config';

// 润色强度映射
const polishIntensityMap = {
  0: '轻度',
  1: '中度',
  2: '重度'
};

/**
 * 调用 Coze 文案润色工作流
 * @param originalText 原始文本
 * @param styleType 风格类型
 * @param polishIntensity 润色强度索引（0: 轻度, 1: 中度, 2: 重度）
 * @param configService 配置服务
 * @returns 润色后的文本
 */
export async function callCozePolishWorkflow(
  originalText: string,
  styleType: string,
  polishIntensity: number,
  configService: ConfigService
): Promise<string> {
  // 验证参数
  if (!originalText || originalText.trim() === '') {
    throw new Error('原始文本不能为空');
  }
  
  if (!styleType || styleType.trim() === '') {
    throw new Error('风格类型不能为空');
  }
  
  if (![0, 1, 2].includes(polishIntensity)) {
    throw new Error('润色强度必须是 0（轻度）、1（中度）或 2（重度）');
  }
  
  // 获取 token
  const token = configService.get<string>('COZE_POLISH_TOKEN');
  if (!token) {
    throw new Error('缺少 COZE_POLISH_TOKEN，请先在 .env 中配置');
  }
  
  // 构建请求体
  const payload = {
    original_text: originalText,
    style_type: styleType,
    polish_intensity: polishIntensityMap[polishIntensity as keyof typeof polishIntensityMap]
  };
  
  // 发送请求
  const response = await fetch('https://2r4t9qx54p.coze.site/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  // 检查响应状态
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`调用 Coze 文案润色工作流失败: ${errorText}`);
  }
  
  // 获取响应数据
  const result = await response.text();
  return result;
}

/**
 * 调用 Coze 素材匹配工作流
 * @param voiceData 声音数据数组
 * @param imageData 图片数据数组
 * @param configService 配置服务
 * @returns 匹配结果
 */
export async function callCozeMaterialMatch(
  voiceData: unknown[],
  imageData: unknown[],
  configService: ConfigService
): Promise<{ status: number; contentType: string; bodyText: string }> {
  // 验证参数
  if (!Array.isArray(voiceData) || voiceData.length === 0) {
    throw new Error('voiceData 必填，且必须为非空数组');
  }
  if (!Array.isArray(imageData) || imageData.length === 0) {
    throw new Error('imageData 必填，且必须为非空数组');
  }
  
  // 获取 token
  const token = configService.get<string>('COZE_MATERIAL_MATCH_TOKEN');
  if (!token) {
    throw new Error('缺少 COZE_MATERIAL_MATCH_TOKEN，请先在 .env 中配置');
  }
  
  // 构建请求体
  const payload = {
    voice_data: voiceData,
    image_data: imageData
  };
  
  // 发送请求
  const materialMatchUrl = configService.get<string>('COZE_MATERIAL_MATCH_URL') || 'https://zjvcxg3wvv.coze.site/run';
  const response = await fetch(materialMatchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  // 获取响应数据
  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();
  
  return {
    status: response.status,
    contentType,
    bodyText
  };
}
