import axios from 'axios'
import { useAuthStore } from '../store/useAuthStore'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
})

const getErrorMessage = (error: any) => {
  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }
  if (error.code === 'ERR_NETWORK') {
    return '网络连接失败，请确认后端服务已启动'
  }
  return error.response?.data?.message || error.message || '请求失败'
}

request.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data?.code !== 0) {
      return Promise.reject(new Error(data?.message || '请求失败'))
    }
    return data.data
  },
  (error) => {
    const message = getErrorMessage(error)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    const normalizedError = new Error(message) as Error & {
      code?: string
      status?: number
    }
    normalizedError.code = error.code
    normalizedError.status = error.response?.status
    return Promise.reject(normalizedError)
  },
)

export default request
