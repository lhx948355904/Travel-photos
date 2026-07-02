import axios from 'axios'
import { useAuthStore } from '../store/useAuthStore'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
})

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
    const message = error.response?.data?.message || error.message || '请求失败'
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(new Error(message))
  },
)

export default request
