import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
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
    return Promise.reject(new Error(message))
  },
)

export default request
