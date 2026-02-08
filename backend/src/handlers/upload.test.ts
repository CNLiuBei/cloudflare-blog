/**
 * 文件上传 API 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleUpload,
  generateUniqueFilename,
  isValidImageType,
  isValidFileSize,
  getAllowedMimeTypes,
  getMaxFileSize,
} from './upload';
import type { ApiResponse } from '../utils/response';
import type { UploadResponse } from '../models/types';

// 创建模拟环境
function createMockEnv() {
  return {
    DB: {},
    BUCKET: {
      put: vi.fn(() => Promise.resolve()),
    },
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'test',
  };
}

describe('文件上传 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateUniqueFilename', () => {
    it('应该生成带正确扩展名的文件名', () => {
      const filename = generateUniqueFilename('image/jpeg');
      expect(filename).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
    });

    it('应该为 PNG 生成 .png 扩展名', () => {
      const filename = generateUniqueFilename('image/png');
      expect(filename).toMatch(/\.png$/);
    });

    it('应该为 GIF 生成 .gif 扩展名', () => {
      const filename = generateUniqueFilename('image/gif');
      expect(filename).toMatch(/\.gif$/);
    });

    it('应该为 WebP 生成 .webp 扩展名', () => {
      const filename = generateUniqueFilename('image/webp');
      expect(filename).toMatch(/\.webp$/);
    });

    it('应该为 SVG 生成 .svg 扩展名', () => {
      const filename = generateUniqueFilename('image/svg+xml');
      expect(filename).toMatch(/\.svg$/);
    });

    it('应该为未知类型生成 .bin 扩展名', () => {
      const filename = generateUniqueFilename('application/octet-stream');
      expect(filename).toMatch(/\.bin$/);
    });

    it('应该生成唯一的文件名', () => {
      const filenames = new Set<string>();
      for (let i = 0; i < 100; i++) {
        filenames.add(generateUniqueFilename('image/jpeg'));
      }
      expect(filenames.size).toBe(100);
    });
  });

  describe('isValidImageType', () => {
    it('应该接受 JPEG', () => {
      expect(isValidImageType('image/jpeg')).toBe(true);
    });

    it('应该接受 PNG', () => {
      expect(isValidImageType('image/png')).toBe(true);
    });

    it('应该接受 GIF', () => {
      expect(isValidImageType('image/gif')).toBe(true);
    });

    it('应该接受 WebP', () => {
      expect(isValidImageType('image/webp')).toBe(true);
    });

    it('应该接受 SVG', () => {
      expect(isValidImageType('image/svg+xml')).toBe(true);
    });

    it('应该拒绝 PDF', () => {
      expect(isValidImageType('application/pdf')).toBe(false);
    });

    it('应该拒绝文本文件', () => {
      expect(isValidImageType('text/plain')).toBe(false);
    });

    it('应该拒绝 JavaScript', () => {
      expect(isValidImageType('application/javascript')).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('应该接受小于 10MB 的文件', () => {
      expect(isValidFileSize(1024 * 1024)).toBe(true); // 1MB
    });

    it('应该接受正好 10MB 的文件', () => {
      expect(isValidFileSize(10 * 1024 * 1024)).toBe(true);
    });

    it('应该拒绝大于 10MB 的文件', () => {
      expect(isValidFileSize(10 * 1024 * 1024 + 1)).toBe(false);
    });

    it('应该拒绝 0 字节的文件', () => {
      expect(isValidFileSize(0)).toBe(false);
    });

    it('应该拒绝负数大小', () => {
      expect(isValidFileSize(-1)).toBe(false);
    });
  });

  describe('handleUpload', () => {
    it('应该成功上传图片（二进制方式）', async () => {
      const env = createMockEnv();
      const imageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG magic bytes

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: imageData,
      });

      const response = await handleUpload(request, env as any);
      const data = await response.json() as ApiResponse<UploadResponse>;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data?.url).toMatch(/^\/uploads\//);
      expect(data.data?.filename).toMatch(/\.png$/);
      expect(env.BUCKET.put).toHaveBeenCalled();
    });

    it('应该返回 400 当文件类型无效时', async () => {
      const env = createMockEnv();

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      });

      const response = await handleUpload(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('Invalid file type');
    });

    it('应该返回 400 当文件过大时', async () => {
      const env = createMockEnv();
      const largeData = new Uint8Array(11 * 1024 * 1024); // 11MB

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: largeData,
      });

      const response = await handleUpload(request, env as any);
      const data = await response.json() as ApiResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('File too large');
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('应该返回允许的 MIME 类型列表', () => {
      const types = getAllowedMimeTypes();
      expect(types).toContain('image/jpeg');
      expect(types).toContain('image/png');
      expect(types).toContain('image/gif');
      expect(types).toContain('image/webp');
      expect(types).toContain('image/svg+xml');
    });
  });

  describe('getMaxFileSize', () => {
    it('应该返回 10MB', () => {
      expect(getMaxFileSize()).toBe(10 * 1024 * 1024);
    });
  });
});
