/**
 * 分类 API 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleGetCategories,
  handleGetCategory,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
} from './categories';
import type { ApiResponse } from '../utils/response';
import type { Category } from '../models/types';

// 创建模拟环境
function createMockEnv(options: {
  allResults?: Category[];
  firstResult?: unknown;
  runResult?: { success: boolean };
} = {}) {
  return {
    DB: {
      prepare: vi.fn(() => ({
        all: vi.fn(() => Promise.resolve({ results: options.allResults || [] })),
        first: vi.fn(() => Promise.resolve(options.firstResult)),
        bind: vi.fn(() => ({
          all: vi.fn(() => Promise.resolve({ results: options.allResults || [] })),
          first: vi.fn(() => Promise.resolve(options.firstResult)),
          run: vi.fn(() => Promise.resolve(options.runResult || { success: true })),
        })),
      })),
    },
    BUCKET: {},
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'test',
  };
}

// 创建模拟请求
function createRequest(body?: object, method = 'POST'): Request {
  return new Request('http://localhost/api/admin/category', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('分类 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGetCategories', () => {
    it('应该返回所有分类', async () => {
      const mockCategories: Category[] = [
        { id: 1, name: '技术', slug: 'tech', created_at: '2024-01-01' },
        { id: 2, name: '生活', slug: 'life', created_at: '2024-01-02' },
      ];
      const env = createMockEnv({ allResults: mockCategories });

      const request = new Request('http://localhost/api/categories');
      const response = await handleGetCategories(request, env as any);
      const data = await response.json() as ApiResponse<Category[]>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('应该返回空数组当没有分类时', async () => {
      const env = createMockEnv({ allResults: [] });

      const request = new Request('http://localhost/api/categories');
      const response = await handleGetCategories(request, env as any);
      const data = await response.json() as ApiResponse<Category[]>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });
  });

  describe('handleGetCategory', () => {
    it('应该返回指定分类', async () => {
      const mockCategory: Category = { id: 1, name: '技术', slug: 'tech', created_at: '2024-01-01' };
      const env = createMockEnv({ firstResult: mockCategory });

      const request = new Request('http://localhost/api/category/1');
      const response = await handleGetCategory(request, env as any, 1);
      const data = await response.json() as ApiResponse<Category>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.name).toBe('技术');
    });

    it('应该返回 404 当分类不存在时', async () => {
      const env = createMockEnv({ firstResult: null });

      const request = new Request('http://localhost/api/category/999');
      const response = await handleGetCategory(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('handleCreateCategory', () => {
    it('应该成功创建分类', async () => {
      const newCategory: Category = { id: 1, name: '技术', slug: 'tech', created_at: '2024-01-01' };
      
      // 模拟：slug 不存在，然后返回创建的分类
      let callCount = 0;
      const env = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(() => {
                callCount++;
                // 第一次调用检查 slug 是否存在，返回 null
                // 第二次调用返回创建的分类
                return Promise.resolve(callCount === 1 ? null : newCategory);
              }),
            })),
          })),
        },
        BUCKET: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'test',
      };

      const request = createRequest({ name: '技术', slug: 'tech', description: '技术文章' });
      const response = await handleCreateCategory(request, env as any);
      const data = await response.json() as ApiResponse<Category>;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('应该返回 400 当缺少 name 时', async () => {
      const env = createMockEnv();

      const request = createRequest({ slug: 'tech' });
      const response = await handleCreateCategory(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('应该返回 400 当缺少 slug 时', async () => {
      const env = createMockEnv();

      const request = createRequest({ name: '技术' });
      const response = await handleCreateCategory(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('应该返回 409 当 slug 已存在时', async () => {
      const env = createMockEnv({ firstResult: { id: 1 } });

      const request = createRequest({ name: '技术', slug: 'tech' });
      const response = await handleCreateCategory(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });
  });

  describe('handleUpdateCategory', () => {
    it('应该成功更新分类', async () => {
      const updatedCategory: Category = { id: 1, name: '新技术', slug: 'new-tech', created_at: '2024-01-01' };
      
      let callCount = 0;
      const env = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(() => {
                callCount++;
                // 第一次：检查分类是否存在
                // 第二次：检查 slug 冲突
                // 第三次：返回更新后的分类
                if (callCount === 1) return Promise.resolve({ id: 1 });
                if (callCount === 2) return Promise.resolve(null);
                return Promise.resolve(updatedCategory);
              }),
            })),
          })),
        },
        BUCKET: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'test',
      };

      const request = createRequest({ name: '新技术', slug: 'new-tech' }, 'PUT');
      const response = await handleUpdateCategory(request, env as any, 1);
      const data = await response.json() as ApiResponse<Category>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该返回 404 当分类不存在时', async () => {
      const env = createMockEnv({ firstResult: null });

      const request = createRequest({ name: '技术', slug: 'tech' }, 'PUT');
      const response = await handleUpdateCategory(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('handleDeleteCategory', () => {
    it('应该成功删除没有关联文章的分类', async () => {
      let callCount = 0;
      const env = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(() => {
                callCount++;
                // 第一次：检查分类是否存在
                // 第二次：检查关联文章数量
                if (callCount === 1) return Promise.resolve({ id: 1 });
                return Promise.resolve({ count: 0 });
              }),
              run: vi.fn(() => Promise.resolve({ success: true })),
            })),
          })),
        },
        BUCKET: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'test',
      };

      const request = new Request('http://localhost/api/admin/category/1', { method: 'DELETE' });
      const response = await handleDeleteCategory(request, env as any, 1);
      const data = await response.json() as ApiResponse<{ deleted: boolean }>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.deleted).toBe(true);
    });

    it('应该返回 409 当分类有关联文章时', async () => {
      let callCount = 0;
      const env = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve({ id: 1 });
                return Promise.resolve({ count: 5 });
              }),
            })),
          })),
        },
        BUCKET: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'test',
      };

      const request = new Request('http://localhost/api/admin/category/1', { method: 'DELETE' });
      const response = await handleDeleteCategory(request, env as any, 1);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('5 article(s)');
    });

    it('应该返回 404 当分类不存在时', async () => {
      const env = createMockEnv({ firstResult: null });

      const request = new Request('http://localhost/api/admin/category/999', { method: 'DELETE' });
      const response = await handleDeleteCategory(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
