const OSS = require('ali-oss');
const env = require('dotenv').config();

const client = new OSS({
    region: 'oss-cn-hangzhou', // 对应你的地域：华东1(杭州)
    accessKeyId: env.parsed.ACCESS_KEY_ID,
    accessKeySecret: env.parsed.OSS_SECRET,
    bucket: 'icarus1'
});

function accessUrlForObject(ossFileName, putResult) {
    if (putResult && typeof putResult.url === 'string' && putResult.url.trim()) {
        return putResult.url;
    }
    return `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${ossFileName}`;
}

async function uploadBufferAndGetUrl(buffer, ossFileName) {
    try {
        const result = await client.put(ossFileName, buffer);
        const fileUrl = accessUrlForObject(ossFileName, result);
        // console.log('文件访问 URL:', fileUrl);
        return fileUrl;
    } catch (err) {
        console.error('上传失败:', err);
    }
}

async function uploadFileAndGetUrl(localFilePath, ossFileName) {
    try {
        const result = await client.put(ossFileName, localFilePath);
        const fileUrl = accessUrlForObject(ossFileName, result);
        // console.log('文件访问 URL:', fileUrl);
        return fileUrl;
    } catch (err) {
        console.error('上传失败:', err);
    }
}

// 使用示例
// uploadFileAndGetUrl('./test.jpg', 'images/test.jpg');

module.exports = {
    uploadFileAndGetUrl,
    uploadBufferAndGetUrl,
};