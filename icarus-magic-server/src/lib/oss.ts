import * as OSS from 'ali-oss';
import { ConfigService } from '@nestjs/config';

class OSSClient {
  private client: OSS;

  constructor(private configService: ConfigService) {
    this.client = new OSS({
      region: 'oss-cn-hangzhou',
      accessKeyId: this.configService.get<string>('OSS_ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get<string>('OSS_SECRET'),
      bucket: 'icarus1',
    });
  }

  private accessUrlForObject(ossFileName: string, putResult?: OSS.PutObjectResult): string {
    if (putResult && putResult.url) {
      return putResult.url;
    }
    return `https://${this.client.options.bucket}.${this.client.options.region}.aliyuncs.com/${ossFileName}`;
  }

  async uploadBufferAndGetUrl(buffer: Buffer, ossFileName: string): Promise<string | undefined> {
    try {
      const result = await this.client.put(ossFileName, buffer);
      const fileUrl = this.accessUrlForObject(ossFileName, result);
      return fileUrl;
    } catch (err) {
      console.error('上传失败:', err);
      return undefined;
    }
  }

  async uploadFileAndGetUrl(localFilePath: string, ossFileName: string): Promise<string | undefined> {
    try {
      const result = await this.client.put(ossFileName, localFilePath);
      const fileUrl = this.accessUrlForObject(ossFileName, result);
      return fileUrl;
    } catch (err) {
      console.error('上传失败:', err);
      return undefined;
    }
  }
}

export default OSSClient;