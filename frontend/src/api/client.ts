/**
 * API 客户端封装
 * 
 * 使用 Axios 实现统一的 API 请求处理
 * - 请求拦截器：自动附加 JWT 令牌
 * - 响应拦截器：统一错误处理
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API 响应格式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

// API 错误类型
export class ApiError extends Error {
  code: string;
  details?: Record<string, string>;
  status: number;

  constructor(code: string, message: string, status: number, details?: Record<string, string>) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
    this.name = 'ApiError';
  }
}

// Token 存储键名
const TOKEN_KEY = 'blog_admin_token';
const TOKEN_EXPIRES_KEY = 'blog_admin_token_expires';

/**
 * 获取存储的 JWT 令牌
 */
export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
  
  if (!token || !expiresAt) {
    return null;
  }
  
  // 检查是否过期
  if (Date.now() / 1000 > parseInt(expiresAt, 10)) {
    clearToken();
    return null;
  }
  
  return token;
}

/**
 * 保存 JWT 令牌
 */
export function setToken(token: string, expiresAt: number): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
}

/**
 * 清除 JWT 令牌
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_KEY);
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// API 基础 URL（开发环境使用代理，生产环境使用实际 URL）
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * 创建 Axios 实例
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器
 * - 自动附加 JWT 令牌到 Authorization header
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 * - 统一处理 API 响应格式
 * - 统一处理错误
 */
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;
    
    if (!data.success) {
      throw new ApiError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An unknown error occurred',
        response.status,
        data.error?.details
      );
    }
    
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response) {
      const data = error.response.data;
      
      // 处理 401 未授权错误
      if (error.response.status === 401) {
        clearToken();
        // 可以在这里触发重定向到登录页
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      
      throw new ApiError(
        data?.error?.code || 'REQUEST_FAILED',
        data?.error?.message || error.message,
        error.response.status,
        data?.error?.details
      );
    }
    
    // 网络错误或超时
    throw new ApiError(
      'NETWORK_ERROR',
      error.message || 'Network error',
      0
    );
  }
);

/**
 * 封装的 API 请求方法
 */
export const api = {
  /**
   * GET 请求
   */
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(url, { params });
    return response.data.data as T;
  },

  /**
   * POST 请求
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(url, data);
    return response.data.data as T;
  },

  /**
   * PUT 请求
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await apiClient.put<ApiResponse<T>>(url, data);
    return response.data.data as T;
  },

  /**
   * DELETE 请求
   */
  async delete<T>(url: string): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(url);
    return response.data.data as T;
  },

  /**
   * 上传文件
   */
  async upload<T>(url: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data as T;
  },
};

export default api;
