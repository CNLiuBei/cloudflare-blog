/**
 * 分类 API
 */

import api from './client';
import type { Category, CategoryFormData } from './types';

export const categoriesApi = {
  /**
   * 获取所有分类
   */
  async getAll(): Promise<Category[]> {
    return api.get<Category[]>('/categories');
  },

  /**
   * 获取单个分类
   */
  async getById(id: number): Promise<Category> {
    return api.get<Category>(`/category/${id}`);
  },

  /**
   * 创建分类
   */
  async create(data: CategoryFormData): Promise<Category> {
    return api.post<Category>('/admin/category', data);
  },

  /**
   * 更新分类
   */
  async update(id: number, data: CategoryFormData): Promise<Category> {
    return api.put<Category>(`/admin/category/${id}`, data);
  },

  /**
   * 删除分类
   */
  async delete(id: number): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/admin/category/${id}`);
  },
};

export default categoriesApi;
