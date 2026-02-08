/**
 * 标签 API
 */

import api from './client';
import type { Tag, TagFormData } from './types';

export const tagsApi = {
  /**
   * 获取所有标签
   */
  async getAll(): Promise<Tag[]> {
    return api.get<Tag[]>('/tags');
  },

  /**
   * 获取单个标签
   */
  async getById(id: number): Promise<Tag> {
    return api.get<Tag>(`/tag/${id}`);
  },

  /**
   * 创建标签
   */
  async create(data: TagFormData): Promise<Tag> {
    return api.post<Tag>('/admin/tag', data);
  },

  /**
   * 删除标签
   */
  async delete(id: number): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/admin/tag/${id}`);
  },
};

export default tagsApi;
