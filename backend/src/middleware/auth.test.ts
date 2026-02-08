/**
 * 认证中间件单元测试
 * 
 * 验证 JWT 认证中间件的正确性
 * 
 * 需求: 1.3, 1.4, 11.6
 * - 1.3: 携带有效 JWT 的请求应该被允许访问
 * - 1.4: 携带无效或过期 JWT 的请求应该返回 401 错误
 * - 11.6: 实现 JWT 中间件验证受保护的 API 端点
 */

import { describe, it, expect } from 'vitest';
import { authMiddleware, extractBearerToken, isAuthSuccess } from './auth';
import { signToken } from '../utils/jwt';
import type { Env } from '../models/types';

describe('认证中间件', () => {
  const testSecret = 'test-secret-key-for-middleware-testing';
  
  // 模拟 Env 对象
  const mockEnv: Env = {
    JWT_SECRET: testSecret,
    DB: {} as D1Database,
    R2_BUCKET: {} as R2Bucket,
  };

  describe('extractBearerToken', () => {
    it('应该从有效的 Bearer token 中提取令牌', () => {
      const token = extractBearerToken('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
      
      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    });

    it('应该返回 null 当 header 为 null 时', () => {
      const token = extractBearerToken(null);
      
      expect(token).toBeNull();
    });

    it('应该返回 null 当 header 不以 Bearer 开头时', () => {
      const token = extractBearerToken('Basic dXNlcjpwYXNz');
      
      expect(token).toBeNull();
    });

    it('应该返回 null 当 Bearer 后面没有令牌时', () => {
      const token = extractBearerToken('Bearer ');
      
      expect(token).toBeNull();
    });

    it('应该返回 null 当只有 Bearer 关键字时', () => {
      const token = extractBearerToken('Bearer');
      
      expect(token).toBeNull();
    });

    it('应该正确处理令牌前后的空格', () => {
      const token = extractBearerToken('Bearer   eyJhbGciOiJIUzI1NiJ9.test   ');
      
      expect(token).toBe('eyJhbGciOiJIUzI1NiJ9.test');
    });
  });

  describe('authMiddleware', () => {
    it('应该允许携带有效 JWT 的请求访问', async () => {
      // 签发有效令牌
      const token = await signToken({ sub: '1', username: 'admin' }, testSecret);
      
      // 创建带有 Authorization header 的请求
      const request = new Request('https://example.com/api/admin/article', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await authMiddleware(request, mockEnv);
      
      // 验证返回的是用户信息而不是 Response
      expect(result).not.toBeInstanceOf(Response);
      expect(isAuthSuccess(result)).toBe(true);
      
      if (isAuthSuccess(result)) {
        expect(result.user.sub).toBe('1');
        expect(result.user.username).toBe('admin');
      }
    });

    it('应该返回 401 当缺少 Authorization header 时', async () => {
      const request = new Request('https://example.com/api/admin/article');
      
      const result = await authMiddleware(request, mockEnv);
      
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
      
      const body = await (result as Response).json() as { success: boolean; error: { code: string; message: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('应该返回 401 当 Authorization header 格式无效时', async () => {
      const request = new Request('https://example.com/api/admin/article', {
        headers: {
          'Authorization': 'Basic dXNlcjpwYXNz',
        },
      });
      
      const result = await authMiddleware(request, mockEnv);
      
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
    });

    it('应该返回 401 当 JWT 令牌无效时', async () => {
      const request = new Request('https://example.com/api/admin/article', {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });
      
      const result = await authMiddleware(request, mockEnv);
      
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
      
      const body = await (result as Response).json() as { success: boolean; error: { code: string; message: string } };
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid or expired token');
    });

    it('应该返回 401 当 JWT 使用错误的密钥签名时', async () => {
      // 使用不同的密钥签发令牌
      const token = await signToken({ sub: '1', username: 'admin' }, 'wrong-secret');
      
      const request = new Request('https://example.com/api/admin/article', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await authMiddleware(request, mockEnv);
      
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
    });

    it('应该正确解析用户信息', async () => {
      const token = await signToken({ sub: '42', username: 'testuser' }, testSecret);
      
      const request = new Request('https://example.com/api/admin/article', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await authMiddleware(request, mockEnv);
      
      expect(isAuthSuccess(result)).toBe(true);
      
      if (isAuthSuccess(result)) {
        expect(result.user.sub).toBe('42');
        expect(result.user.username).toBe('testuser');
        expect(typeof result.user.iat).toBe('number');
        expect(typeof result.user.exp).toBe('number');
      }
    });
  });

  describe('isAuthSuccess', () => {
    it('应该返回 true 当结果包含用户信息时', () => {
      const result = {
        user: {
          sub: '1',
          username: 'admin',
          iat: 1234567890,
          exp: 1234654290,
        },
      };
      
      expect(isAuthSuccess(result)).toBe(true);
    });

    it('应该返回 false 当结果是 Response 时', () => {
      const result = new Response('Unauthorized', { status: 401 });
      
      expect(isAuthSuccess(result)).toBe(false);
    });
  });
});
