import { requestWithToken } from './index'

/**
 * 获取热点数据（需 token）
 * @param {string} date YYYYMMDD
 */
export function getHotspotByDate(date) {
    return requestWithToken.get('/hotspot', {
        params: { date },
    })
}

/**
 * 强制刷新热点数据（需 token）
 * @param {string} date YYYYMMDD
 */
export function refreshHotspotByDate(date) {
    return requestWithToken.get('/hotspot/refresh', {
        params: { date },
    })
}

/**
 * 调用 Coze 事件详情接口（需 token）
 * @param {{ id: number|string, event_title: string }} payload
 */
export function runCozeEventDetail(payload) {
    return requestWithToken.post('/coze/event-detail', payload)
}

/** 兼容旧调用名 */
export const runCoze = runCozeEventDetail

/**
 * 使用标题调用 Coze（需 token）
 * @param {number|string} id
 * @param {string} eventTitle
 */
export function runCozeBySummary(id, eventTitle) {
    return runCozeEventDetail({ id: String(id), event_title: eventTitle })
}

/**
 * 根据 id 获取热点详情（需 token）
 * @param {number|string} id
 */
export function getHotspotDetailById(id) {
    return requestWithToken.get('/hotspot/detail', {
        params: { id },
    })
}

/**
 * 获取默认参考音列表（sounds 表，需 token）
 */
export function getDefaultSounds() {
    return requestWithToken.get('/sound/defaults')
}

/**
 * 获取字幕列表全量（subtitles 表，需 token）
 */
export function getSubtitles() {
    return requestWithToken.get('/subtitles')
}

/** 语音合成请求超时（含音色复刻轮询，需长于默认 30s） */
const SOUND_SYNTHESIZE_TIMEOUT_MS = 180000

/**
 * 语音合成：参考音频公网 URL + 待合成文本（需 token）
 * 成功时 `response.data` 含 `message` 与 `data`（audioBase64、format、voiceId、mimeType）
 * @param {{ url: string, text: string }} payload
 */
export function synthesizeSpeech(payload) {
    return requestWithToken.post('/sound/synthesize', payload, {
        timeout: SOUND_SYNTHESIZE_TIMEOUT_MS,
    })
}

/**
 * 上传图片/视频素材到 OSS（需 token）
 * @param {File} file
 */
export function uploadMaterial(file) {
    const formData = new FormData()
    formData.append('material', file)
    return requestWithToken.post('/material/enroll', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        timeout: 180000,
    })
}

/** 一键生成字幕视频（可能多次 Remotion，耗时较长） */
const ONE_CLICK_GENERATE_TIMEOUT_MS = 600000

/**
 * @param {{ subtitles_type: string, subtitle_segments?: string[], subtitles?: string[] }} payload
 */
export function oneClickGenerate(payload) {
    return requestWithToken.post('/generate', payload, {
        timeout: ONE_CLICK_GENERATE_TIMEOUT_MS,
    })
}
