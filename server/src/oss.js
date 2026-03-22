const OSS = require('ali-oss');

const client = new OSS({
    region: 'oss-cn-beijing', // 对应你的地域：华北2(北京)
    accessKeyId: process.env.ali_key,
    accessKeySecret: process.env.ALI_SECRET,
    bucket: 'icarus1'
});

async function uploadFileAndGetUrl(localFilePath, ossFileName) {
    try {
        // 1. 上传文件
        const result = await client.put(ossFileName, localFilePath);
        console.log('上传成功:', result);

        // 2. 获取访问 URL
        // - 公共读 Bucket：直接返回 result.url
        // - 私有 Bucket：生成带签名的 URL（有效期默认 15 分钟）
        let fileUrl;
        if (client.options.bucketACL === 'public-read') {
            fileUrl = result.url;
        } else {
            fileUrl = client.signatureUrl(ossFileName, { expires: 3600 }); // 1小时有效期
        }

        console.log('文件访问 URL:', fileUrl);
        return fileUrl;
    } catch (err) {
        console.error('上传失败:', err);
    }
}

// 使用示例
// uploadFileAndGetUrl('./test.jpg', 'images/test.jpg');

module.exports = {
    uploadFileAndGetUrl
};