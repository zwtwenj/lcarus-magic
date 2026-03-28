const path = require('path');

/**
 * `/a/b` → `./a/b`，供 ffmpeg 工作目录下相对路径
 * @param {string} absStylePath 以 / 开头的路径
 */
function leadingSlashToDotRelative(absStylePath) {
    const s = String(absStylePath || '').trim();
    if (!s) return './';
    if (s.startsWith('./')) return s;
    if (s.startsWith('/')) return `.${s}`;
    return `./${s}`;
}

/**
 * 从完整 URL 取文件名（忽略 query），供本地落盘路径与 file-server basename 一致
 * @param {string} url
 */
function urlToBasename(url) {
    const s = String(url).trim();
    if (!s) return 'unknown-file';
    try {
        const u = new URL(s);
        const base = path.posix.basename(u.pathname);
        return base && base !== '/' ? base : 'unknown-file';
    } catch {
        const noQuery = s.split('?')[0];
        const base = path.posix.basename(noQuery.replace(/\\/g, '/'));
        return base || 'unknown-file';
    }
}

/**
 * 本地绝对风格路径：/{projectDir}/{filename}，与 file-server 写入目录一致
 * @param {string} projectDir download- 时间戳，无首尾斜杠
 * @param {string} url
 */
function localPathFor(projectDir, url) {
    const safe = String(projectDir || 'download').replace(/^\/+|\/+$/g, '');
    const name = urlToBasename(url);
    return `/${safe}/${name}`;
}

/**
 * 从「配音 + 配图」片段列表中收集 OSS 地址，组装 file-server `/download-files` 所需 body；
 * 并生成 ffmpeg 用的 `{ project, timeline }`（voice_url / matched_image_url 为 `./...`）。
 *
 * @param {Array<{
 *   index?: number,
 *   text?: string,
 *   ossUrl?: string,
 *   voice_url?: string,
 *   durationSeconds?: number,
 *   duration?: number,
 *   matched_image_url?: string,
 * }>} segmentList
 * @param {string} projectDir 下载目录名（如 download-时间戳），须与调用方传给 file-server 的 project 一致
 * @returns {{
 *   project: string,
 *   files: string[],
 *   localPathByUrl: Record<string, string>,
 *   ffmpegTimeline: { project: string, timeline: Array<{
 *     index: number,
 *     text: string,
 *     voice_url: string,
 *     duration: number | null,
 *     matched_image_url: string,
 *   }> }
 * }}
 */
function buildDownloadFilesPayload(segmentList, projectDir) {
    const project = String(projectDir ?? '')
        .trim()
        .replace(/^\/+|\/+$/g, '');
    if (!project) {
        throw new Error('buildDownloadFilesPayload: projectDir 不能为空');
    }
    const files = [];
    const seen = new Set();
    /** @type {Record<string, string>} */
    const localPathByUrl = {};

    function registerUrl(url) {
        const u = String(url).trim();
        if (!u || seen.has(u)) return;
        seen.add(u);
        files.push(u);
        localPathByUrl[u] = localPathFor(project, u);
    }

    const emptyTimeline = {
        project: `/${project}`,
        timeline: [],
    };

    if (!Array.isArray(segmentList)) {
        return {
            project,
            files,
            localPathByUrl,
            ffmpegTimeline: emptyTimeline,
        };
    }

    for (const row of segmentList) {
        if (!row || typeof row !== 'object') continue;
        const audio = row.ossUrl ?? row.voice_url;
        if (typeof audio === 'string' && audio.trim()) {
            registerUrl(audio);
        }
        const image = row.matched_image_url;
        if (typeof image === 'string' && image.trim()) {
            registerUrl(image);
        }
    }

    const timeline = segmentList
        .filter((row) => row && typeof row === 'object')
        .map((row, i) => {
            const audioKey = String(
                (typeof row.ossUrl === 'string' && row.ossUrl.trim()
                    ? row.ossUrl
                    : typeof row.voice_url === 'string' && row.voice_url.trim()
                      ? row.voice_url
                      : '') || ''
            ).trim();
            const imageKey =
                typeof row.matched_image_url === 'string'
                    ? row.matched_image_url.trim()
                    : '';

            const absVoice =
                audioKey &&
                (localPathByUrl[audioKey] ?? localPathFor(project, audioKey));
            const absImage =
                imageKey &&
                (localPathByUrl[imageKey] ?? localPathFor(project, imageKey));

            let duration = null;
            if (typeof row.durationSeconds === 'number' && Number.isFinite(row.durationSeconds)) {
                duration = row.durationSeconds;
            } else if (typeof row.duration === 'number' && Number.isFinite(row.duration)) {
                duration = row.duration;
            }

            return {
                index: typeof row.index === 'number' ? row.index : i,
                text: typeof row.text === 'string' ? row.text : '',
                voice_url: absVoice ? leadingSlashToDotRelative(absVoice) : '',
                duration,
                matched_image_url: absImage
                    ? leadingSlashToDotRelative(absImage)
                    : '',
            };
        });

    return {
        project,
        files,
        localPathByUrl,
        ffmpegTimeline: {
            project: `./${project}`,
            timeline,
        },
    };
}

module.exports = {
    buildDownloadFilesPayload,
    urlToBasename,
    localPathFor,
    leadingSlashToDotRelative,
};
