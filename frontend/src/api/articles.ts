/**
 * 文章 API
 */

import api from './client';
import type { Article, ArticleFormData, ArticleListParams, PaginatedResponse } from './types';

export const articlesApi = {
  /**
   * 获取文章列表（公开，仅已发布）
   */
  async getList(params?: ArticleListParams): Promise<PaginatedResponse<Article>> {
    return api.get<PaginatedResponse<Article>>('/articles', params as Record<string, unknown>);
  },

  /**
   * 获取文章详情（公开，仅已发布）
   */
  async getById(id: number): Promise<Article> {
    return api.get<Article>(`/article/${id}`);
  },

  /**
   * 获取文章列表（管理，包含草稿）
   */
  async getAdminList(params?: ArticleListParams): Promise<PaginatedResponse<Article>> {
    return api.get<PaginatedResponse<Article>>('/admin/articles', params as Record<string, unknown>);
  },

  /**
   * 获取文章详情（管理，包含草稿）
   */
  async getAdminById(id: number): Promise<Article> {
    return api.get<Article>(`/admin/article/${id}`);
  },

  /**
   * 创建文章
   */
  async create(data: ArticleFormData): Promise<Article> {
    return api.post<Article>('/admin/article', data);
  },

  /**
   * 更新文章
   */
  async update(id: number, data: ArticleFormData): Promise<Article> {
    return api.put<Article>(`/admin/article/${id}`, data);
  },

  /**
   * 删除文章
   */
  async delete(id: number): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/admin/article/${id}`);
  },

  /**
   * 点赞/取消点赞文章
   */
  async like(id: number, action: 'like' | 'unlike' = 'like'): Promise<{ liked: boolean; like_count: number }> {
    return api.post<{ liked: boolean; like_count: number }>(`/article/${id}/like`, { action });
  },

  /**
   * 置顶/取消置顶文章
   */
  async togglePin(id: number): Promise<{ pinned: boolean; message: string }> {
    return api.post<{ pinned: boolean; message: string }>(`/admin/article/${id}/pin`, {});
  },
};

export default articlesApi;
