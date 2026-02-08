/**
 * 登录 API 单元测试
 * 
 * 测试 POST /api/login 端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleLogin } from './auth';
import * as bcryptjs from 'bcryptjs';
import * as jwt from '../utils/jwt';
import type { ApiResponse } from '../utils/response';
import type { LoginResponse } from '../models/types';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

// Mock jwt utils
vi.mock('../utils/jwt', () => ({
  signToken: vi.fn(),
  getTokenExpirationSeconds: vi.fn(() => 86400),
}));

// 创建模拟环境
function createMockEnv(dbResult: unknown = null) {
  return {
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() => Promise.resolve(dbResult)),
        })),
      })),
    },
    BUCKET: {},
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'test',
  };
}

// 创建模拟请求
function createRequest(body: object, method = 'POST'): Request {
  return new Request('http://localhost/api/login', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('handleLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该在凭据有效时返回 JWT 令牌', async () => {
    const mockAdmin = {
      id: 1,
      username: 'admin',
      password_hash: '$2a$10$hashedpassword',
    };
    const env = createMockEnv(mockAdmin);
    
    vi.mocked(bcryptjs.compare).mockResolvedValue(true as never);
    vi.mocked(jwt.signToken).mockResolvedValue('mock-jwt-token');

    const request = createRequest({ username: 'admin', password: 'admin123' });
    const response = await handleLogin(request, env as any);
    const data = await response.json() as ApiResponse<LoginResponse>;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data?.token).toBe('mock-jwt-token');
    expect(data.data?.expiresAt).toBeDefined();
  });

  it('应该在用户名不存在时返回 401', async () => {
    const env = createMockEnv(null);

    const request = createRequest({ username: 'nonexistent', password: 'password' });
    const response = await handleLogin(request, env as any);
    const data = await response.json() as ApiResponse;

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('UNAUTHORIZED');
  });

  it('应该在密码错误时返回 401', async () => {
    const mockAdmin = {
      id: 1,
      username: 'admin',
      password_hash: '$2a$10$hashedpassword',
    };
    const env = createMockEnv(mockAdmin);
    
    vi.mocked(bcryptjs.compare).mockResolvedValue(false as never);

    const request = createRequest({ username: 'admin', password: 'wrongpassword' });
    const response = await handleLogin(request, env as any);
    const data = await response.json() as ApiResponse;

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('UNAUTHORIZED');
  });

  it('应该在缺少用户名时返回 400', async () => {
    const env = createMockEnv();

    const request = createRequest({ password: 'password' });
    const response = await handleLogin(request, env as any);
    const data = await response.json() as ApiResponse;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('BAD_REQUEST');
  });

  it('应该在缺少密码时返回 400', async () => {
    const env = createMockEnv();

    const request = createRequest({ username: 'admin' });
    const response = await handleLogin(request, env as any);
    const data = await response.json() as ApiResponse;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('BAD_REQUEST');
  });

  it('应该在请求体无效时返回 400', async () => {
    const env = createMockEnv();

    const request = new Request('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });
    const response = await handleLogin(request, env as any);
    const data = await response.json() as ApiResponse;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('应该使用正确的参数调用 signToken', async () => {
    const mockAdmin = {
      id: 42,
      username: 'testuser',
      password_hash: '$2a$10$hashedpassword',
    };
    const env = createMockEnv(mockAdmin);
    
    vi.mocked(bcryptjs.compare).mockResolvedValue(true as never);
    vi.mocked(jwt.signToken).mockResolvedValue('mock-jwt-token');

    const request = createRequest({ username: 'testuser', password: 'password' });
    await handleLogin(request, env as any);

    expect(jwt.signToken).toHaveBeenCalledWith(
      { sub: '42', username: 'testuser' },
      'test-secret'
    );
  });
});
