import axios from 'axios'

const BASE_URL = '/api'
const TOKEN_KEY = 'token'

export function getTokenFromCache() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
}

function createHttpInstance() {
    return axios.create({
        baseURL: BASE_URL,
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
        },
    })
}

// 不携带 token（用于登录等公开接口）
export const request = createHttpInstance()

// 携带 token（在 header 中）
export const requestWithToken = createHttpInstance()
requestWithToken.interceptors.request.use((config) => {
    const token = getTokenFromCache()
    if (token) {
        config.headers = config.headers || {}
        config.headers.token = token
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default request
