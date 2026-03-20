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
 * 调用 Coze 运行接口（需 token）
 * @param {{ id: number|string, event_title: string }} payload
 */
export function runCoze(payload) {
    return requestWithToken.post('/coze/run', payload)
}

/**
 * 使用标题调用 Coze（需 token）
 * @param {number|string} id
 * @param {string} eventTitle
 */
export function runCozeBySummary(id, eventTitle) {
    return runCoze({ id: String(id), event_title: eventTitle })
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
