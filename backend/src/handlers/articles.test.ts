/**
 * 文章 API 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleGetArticles,
  handleGetArticle,
  handleCreateArticle,
  handleUpdateArticle,
  handleDeleteArticle,
} from './articles';
import type { ApiResponse } from '../utils/response';
import type { Article, PaginatedResponse } from '../models/types';

// 创建复杂的模拟环境
function createMockEnv(options: {
  articles?: Article[];
  article?: Article | null;
  count?: number;
  tags?: { id: number; name: string; slug: string; created_at: string }[];
} = {}) {
  const mockArticles = options.articles || [];
  const mockArticle = options.article;
  const mockCount = options.count ?? mockArticles.length;
  const mockTags = options.tags || [];

  return {
    DB: {
      prepare: vi.fn((sql: string) => {
        const isList = sql.includes('SELECT DISTINCT') || sql.includes('FROM articles') && sql.includes('LIMIT');
        const isCount = sql.includes('COUNT');
        const isTagQuery = sql.includes('FROM tags');
        const isCategory = sql.includes('FROM categories');
        const isInsert = sql.includes('INSERT');
        const isUpdate = sql.includes('UPDATE');
        const isDelete = sql.includes('DELETE');

        return {
          all: vi.fn(() => Promise.resolve({ 
            results: isList ? mockArticles : (isTagQuery ? mockTags : [])
          })),
          first: vi.fn(() => {
            if (isCount) return Promise.resolve({ count: mockCount });
            if (isCategory) return Promise.resolve(null);
            return Promise.resolve(mockArticle);
          }),
          bind: vi.fn((..._args: unknown[]) => ({
            all: vi.fn(() => Promise.resolve({ 
              results: isList ? mockArticles : (isTagQuery ? mockTags : [])
            })),
            first: vi.fn(() => {
              if (isCount) return Promise.resolve({ count: mockCount });
              if (isCategory) return Promise.resolve(null);
              if (isInsert || isUpdate) return Promise.resolve(mockArticle);
              return Promise.resolve(mockArticle);
            }),
            run: vi.fn(() => Promise.resolve({ success: true })),
          })),
        };
      }),
    },
    BUCKET: {},
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'test',
  };
}

describe('文章 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGetArticles', () => {
    it('应该返回已发布文章的分页列表', async () => {
      const mockArticles: Article[] = [
        {
          id: 1,
          title: '测试文章',
          content: '内容',
          status: 'published',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      const env = createMockEnv({ articles: mockArticles, count: 1 });

      const request = new Request('http://localhost/api/articles');
      const response = await handleGetArticles(request, env as any);
      const data = await response.json() as ApiResponse<PaginatedResponse<Article>>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.data).toHaveLength(1);
      expect(data.data?.total).toBe(1);
      expect(data.data?.page).toBe(1);
      expect(data.data?.pageSize).toBe(10);
    });

    it('应该支持分页参数', async () => {
      const env = createMockEnv({ articles: [], count: 0 });

      const request = new Request('http://localhost/api/articles?page=2&pageSize=5');
      const response = await handleGetArticles(request, env as any);
      const data = await response.json() as ApiResponse<PaginatedResponse<Article>>;

      expect(response.status).toBe(200);
      expect(data.data?.page).toBe(2);
      expect(data.data?.pageSize).toBe(5);
    });

    it('应该支持分类筛选', async () => {
      const env = createMockEnv({ articles: [], count: 0 });

      const request = new Request('http://localhost/api/articles?categoryId=1');
      const response = await handleGetArticles(request, env as any);

      expect(response.status).toBe(200);
    });

    it('应该支持标签筛选', async () => {
      const env = createMockEnv({ articles: [], count: 0 });

      const request = new Request('http://localhost/api/articles?tagId=1');
      const response = await handleGetArticles(request, env as any);

      expect(response.status).toBe(200);
    });
  });

  describe('handleGetArticle', () => {
    it('应该返回已发布的文章详情', async () => {
      const mockArticle: Article = {
        id: 1,
        title: '测试文章',
        content: '内容',
        status: 'published',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      const env = createMockEnv({ article: mockArticle });

      const request = new Request('http://localhost/api/article/1');
      const response = await handleGetArticle(request, env as any, 1);
      const data = await response.json() as ApiResponse<Article>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.title).toBe('测试文章');
    });

    it('应该返回 404 当文章不存在时', async () => {
      const env = createMockEnv({ article: null });

      const request = new Request('http://localhost/api/article/999');
      const response = await handleGetArticle(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('handleCreateArticle', () => {
    it('应该成功创建文章', async () => {
      const newArticle: Article = {
        id: 1,
        title: '新文章',
        content: '内容',
        status: 'draft',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      const env = createMockEnv({ article: newArticle });

      const request = new Request('http://localhost/api/admin/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '新文章',
          content: '内容',
          status: 'draft',
        }),
      });
      const response = await handleCreateArticle(request, env as any);
      const data = await response.json() as ApiResponse<Article>;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('应该返回 400 当缺少标题时', async () => {
      const env = createMockEnv();

      const request = new Request('http://localhost/api/admin/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '内容', status: 'draft' }),
      });
      const response = await handleCreateArticle(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('应该返回 400 当缺少内容时', async () => {
      const env = createMockEnv();

      const request = new Request('http://localhost/api/admin/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '标题', status: 'draft' }),
      });
      const response = await handleCreateArticle(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('应该返回 400 当状态无效时', async () => {
      const env = createMockEnv();

      const request = new Request('http://localhost/api/admin/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '标题', content: '内容', status: 'invalid' }),
      });
      const response = await handleCreateArticle(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('handleUpdateArticle', () => {
    it('应该成功更新文章', async () => {
      const updatedArticle: Article = {
        id: 1,
        title: '更新后的标题',
        content: '更新后的内容',
        status: 'published',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };
      
      let callCount = 0;
      const env = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve({ id: 1 }); // 检查存在
                return Promise.resolve(updatedArticle);
              }),
              run: vi.fn(() => Promise.resolve({ success: true })),
              all: vi.fn(() => Promise.resolve({ results: [] })),
            })),
          })),
        },
        BUCKET: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'test',
      };

      const request = new Request('http://localhost/api/admin/article/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '更新后的标题',
          content: '更新后的内容',
          status: 'published',
        }),
      });
      const response = await handleUpdateArticle(request, env as any, 1);
      const data = await response.json() as ApiResponse<Article>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该返回 404 当文章不存在时', async () => {
      const env = createMockEnv({ article: null });

      const request = new Request('http://localhost/api/admin/article/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '标题',
          content: '内容',
          status: 'draft',
        }),
      });
      const response = await handleUpdateArticle(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('handleDeleteArticle', () => {
    it('应该成功删除文章', async () => {
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

      const request = new Request('http://localhost/api/admin/article/1', { method: 'DELETE' });
      const response = await handleDeleteArticle(request, env as any, 1);
      const data = await response.json() as ApiResponse<{ deleted: boolean }>;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.deleted).toBe(true);
    });

    it('应该返回 404 当文章不存在时', async () => {
      const env = createMockEnv({ article: null });

      const request = new Request('http://localhost/api/admin/article/999', { method: 'DELETE' });
      const response = await handleDeleteArticle(request, env as any, 999);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
