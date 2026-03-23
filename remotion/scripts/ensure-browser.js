/**
 * 预下载 Remotion 使用的浏览器（不依赖 @remotion/cli）。
 * 用法: node scripts/ensure-browser.js
 * 或: npm run ensure-browser
 *
 * 首次运行会从网络下载，Linux 下若需 GPU 可设环境变量:
 *   REMOTION_CHROME_MODE=chrome-for-testing node scripts/ensure-browser.js
 */
const { ensureBrowser } = require('@remotion/renderer');

const chromeMode = process.env.REMOTION_CHROME_MODE === 'chrome-for-testing'
    ? 'chrome-for-testing'
    : 'headless-shell';

console.log('正在确保 Remotion 浏览器已安装 (chromeMode:', chromeMode, ')...');

ensureBrowser({
    chromeMode,
    onBrowserDownload: () => {
        console.log('开始下载浏览器，请稍候...');
        return {
            version: null,
            onProgress: ({ percent, downloadedBytes, totalSizeInBytes }) => {
                if (percent != null) {
                    console.log(`下载进度: ${Math.round(percent * 100)}%`);
                } else if (downloadedBytes != null) {
                    const total = totalSizeInBytes != null ? ` / ${totalSizeInBytes}` : '';
                    console.log(`已下载: ${downloadedBytes}${total} bytes`);
                }
            },
        };
    },
})
    .then(() => console.log('浏览器已就绪。'))
    .catch((err) => {
        console.error('预下载失败:', err);
        process.exit(1);
    });
