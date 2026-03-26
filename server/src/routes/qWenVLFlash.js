const router = require('express').Router();
const { askImage } = require('../qWenVLFlash');
const PROMPT = '帮我对你收到的图片进行打标，输出json格式为[{url: \'\', tip: []}]，url为图片的地址，tip为标签数组例如[\'清晨\', \'太阳\']';



/**
 * POST /api/qwen-vl-flash/ask
 * body:
 * {
 *   "image": "https://...",
 *   "prompt": "解答这道题？"
 * }
 *
 * 或批量：
 * {
 *   "images": ["https://a.jpg", "https://b.jpg"],
 *   "prompt": "请描述图片内容"
 * }
 */
router.post('/qwen-vl-flash/ask', async (req, res) => {
    
});

module.exports = router;
