import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.request.use(
  (config) => {
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

export interface UploadResponse {
  url: string;
}

export const uploadMaterial = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('/api/common/upload/material', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });

    if (response.data?.url) {
      return response.data.url;
    }

    throw new Error('上传失败');
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || '上传失败';
    ElMessage.error(message);
    throw new Error(message);
  }
};

export const uploadSound = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('/api/common/upload/sound', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });

    if (response.data?.url) {
      return response.data.url;
    }

    throw new Error('上传失败');
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || '上传失败';
    ElMessage.error(message);
    throw new Error(message);
  }
};