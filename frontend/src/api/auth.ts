/**
 * 认证 API
 */

import api, { setToken, clearToken, isAuthenticated } from './client';
import type { LoginRequest, LoginResponse } from './types';

export const authApi = {
  /**
   * 管理员登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/login', data);
    setToken(response.token, response.expiresAt);
    return response;
  },

  /**
   * 登出
   */
  logout(): void {
    clearToken();
  },

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return isAuthenticated();
  },
};

export default authApi;
