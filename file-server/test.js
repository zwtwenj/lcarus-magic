const sharp = require('sharp');
const path = require('path');

/**
 * 将 1.jpg 转换为指定尺寸的图片
 * @param {number} width - 目标宽度（像素）
 * @param {number} height - 目标高度（像素）
 * @returns {Promise<string>} - 返回生成的图片路径
 */
async function resizeImage(width, height) {
  const inputPath = path.join(__dirname, '1.jpg');
  const outputPath = path.join(__dirname, `1_${width}x${height}.jpg`);

  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: sharp.fit.contain,
        withoutEnlargement: false
      })
      .toFile(outputPath);

    console.log(`图片已成功转换为 ${width}px * ${height}px`);
    console.log(`输出路径: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('图片转换失败:', error);
    throw error;
  }
}

// 示例用法
// resizeImage(800, 600).then(console.log).catch(console.error);

module.exports = { resizeImage };
