/**
 * 标签 API 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleGetTags,
  handleGetTag,
  handleCreateTag,
  handleDeleteTag,
} from './tags';
import type { ApiResponse } from '../utils/response';
import type { Tag } from '../models/types';

// 创建模拟环境
function createMockEnv(options: {
  allResults?: Tag[];
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
  return new Request('http://localhost/api/admin/tag', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('标签 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGetTags', () => {
    it('应该返回所有标签', async () => {
      const mockTags: Tag[] = [
        { id: 1, name: 'JavaScript', slug: 'javascript', created_at: '2024-01-01' },
        { id: 2, name: 'TypeScript', slug: 'typescript', created_at: '2024-01-02' },
      ];
      const env = createMockEnv({ allResults: mockTags });

      const request = new Request('http://localhost/api/tags');
      const response = await handleGetTags(request, env as any);
      const data = await response.json() as ApiResponse<Tag[]>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('应该返回空数组当没有标签时', async () => {
      const env = createMockEnv({ allResults: [] });

      const request = new Request('http://localhost/api/tags');
      const response = await handleGetTags(request, env as any);
      const data = await response.json() as ApiResponse<Tag[]>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });
  });

  describe('handleGetTag', () => {
    it('应该返回指定标签', async () => {
      const mockTag: Tag = { id: 1, name: 'JavaScript', slug: 'javascript', created_at: '2024-01-01' };
      const env = createMockEnv({ firstResult: mockTag });

      const request = new Request('http://localhost/api/tag/1');
      const response = await handleGetTag(request, env as any, 1);
      const data = await response.json() as ApiResponse<Tag>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.name).toBe('JavaScript');
    });

    it('应该返回 404 当标签不存在时', async () => {
      const env = createMockEnv({ firstResult: null });

      const request = new Request('http://localhost/api/tag/999');
      const response = await handleGetTag(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('handleCreateTag', () => {
    it('应该成功创建标签', async () => {
      const newTag: Tag = { id: 1, name: 'JavaScript', slug: 'javascript', created_at: '2024-01-01' };
      
      let callCount = 0;
      const env = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(() => {
                callCount++;
                return Promise.resolve(callCount === 1 ? null : newTag);
              }),
            })),
          })),
        },
        BUCKET: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'test',
      };

      const request = createRequest({ name: 'JavaScript', slug: 'javascript' });
      const response = await handleCreateTag(request, env as any);
      const data = await response.json() as ApiResponse<Tag>;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('应该返回 400 当缺少 name 时', async () => {
      const env = createMockEnv();

      const request = createRequest({ slug: 'javascript' });
      const response = await handleCreateTag(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('应该返回 400 当缺少 slug 时', async () => {
      const env = createMockEnv();

      const request = createRequest({ name: 'JavaScript' });
      const response = await handleCreateTag(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('应该返回 409 当 slug 已存在时', async () => {
      const env = createMockEnv({ firstResult: { id: 1 } });

      const request = createRequest({ name: 'JavaScript', slug: 'javascript' });
      const response = await handleCreateTag(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });
  });

  describe('handleDeleteTag', () => {
    it('应该成功删除标签', async () => {
      const env = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(() => Promise.resolve({ id: 1 })),
              run: vi.fn(() => Promise.resolve({ success: true })),
            })),
          })),
        },
        BUCKET: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'test',
      };

      const request = new Request('http://localhost/api/admin/tag/1', { method: 'DELETE' });
      const response = await handleDeleteTag(request, env as any, 1);
      const data = await response.json() as ApiResponse<{ deleted: boolean }>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.deleted).toBe(true);
    });

    it('应该返回 404 当标签不存在时', async () => {
      const env = createMockEnv({ firstResult: null });

      const request = new Request('http://localhost/api/admin/tag/999', { method: 'DELETE' });
      const response = await handleDeleteTag(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
