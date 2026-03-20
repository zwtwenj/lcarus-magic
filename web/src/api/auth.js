import { request } from './index'

/**
 * 登录
 * @param {{ account: string, password: string }} payload
 */
export function login(payload) {
    return request.post('/auth/login', payload)
}
