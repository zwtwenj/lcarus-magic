import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从缓存中获取 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 假设后端返回格式为 { code: number, data: any, message: string }
    const res = response.data
    if (res.code === 100) {
      // code 为 100 代表请求成功
      return res.data
    } else {
      // 其他状态码处理
      console.error('请求失败:', res.message)
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  (error) => {
    console.error('网络错误:', error)
    return Promise.reject(error)
  }
)

export {
    request,
}