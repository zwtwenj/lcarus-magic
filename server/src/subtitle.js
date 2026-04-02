const fs = require('fs');
const path = require('path');

/**
 * 秒数 → SRT 时间戳（HH:MM:SS,mmm）
 * @param {number} totalSeconds
 */
function formatSrtTimestamp(totalSeconds) {
    const s = Math.max(0, Number(totalSeconds) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.min(
        999,
        Math.round((s - Math.floor(s)) * 1000)
    );
    const pad2 = (n) => String(n).padStart(2, '0');
    const pad3 = (n) => String(n).padStart(3, '0');
    return `${pad2(h)}:${pad2(m)}:${pad2(sec)},${pad3(ms)}`;
}

/**
 * 根据配音片段列表生成 SRT 字幕文件（按 index 排序，时间轴由 durationSeconds 顺序累加）。
 *
 * @param {Array<{
 *   index?: number,
 *   text?: string,
 *   durationSeconds?: number,
 *   voiceId?: string,
 *   ossUrl?: string,
 *   format?: string,
 * }>} audios
 * @param {string} outputPath 写入路径（目录需已存在）
 */
function generateSrtFromAudios(audios, outputPath) {
    const out = String(outputPath || '').trim();
    if (!out) {
        throw new Error('generateSrtFromAudios: outputPath 不能为空');
    }

    const rows = [...(Array.isArray(audios) ? audios : [])]
        .filter((r) => r && typeof r === 'object')
        .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));

    let t = 0;
    const blocks = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const dur = Number(row.durationSeconds);
        const duration =
            Number.isFinite(dur) && dur >= 0 ? dur : 0;
        const start = t;
        const end = t + duration;
        t = end;
        const text =
            typeof row.text === 'string' ? row.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
        blocks.push(
            `${i + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${text}`
        );
    }

    const content = blocks.join('\n\n');
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, content ? `${content}\n` : '', 'utf8');
}

module.exports = { generateSrtFromAudios };
