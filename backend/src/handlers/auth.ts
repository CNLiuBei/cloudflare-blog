/**
 * 认证处理器
 * 
 * 实现管理员登录 API
 * 
 * 需求: 1.1, 1.2, 11.2
 * - POST /api/login: 验证用户名密码，返回 JWT 令牌
 */

import { compare } from 'bcryptjs';
import { signToken, getTokenExpirationSeconds } from '../utils/jwt';
import { success, unauthorized, badRequest, internalError } from '../utils/response';
import { validateStringLength, INPUT_LIMITS } from '../middleware/security';
import type { Env } from '../types/env';
import type { LoginRequest, LoginResponse, Admin } from '../models/types';

/**
 * 处理登录请求
 * 
 * POST /api/login
 * 
 * @param request - HTTP 请求对象
 * @param env - Cloudflare Workers 环境绑定
 * @returns HTTP 响应
 * 
 * 验证: 需求 1.1 - 有效凭据返回 JWT 令牌
 * 验证: 需求 1.2 - 无效凭据返回 401 错误
 */
export async function handleLogin(
  request: Request,
  env: Env
): Promise<Response> {
  // 验证请求方法
  if (request.method !== 'POST') {
    return badRequest('Method not allowed');
  }

  // 解析请求体
  let body: LoginRequest;
  try {
    body = await request.json() as LoginRequest;
  } catch {
    return badRequest('Invalid JSON body');
  }

  // 验证必填字段
  if (!body.username || typeof body.username !== 'string') {
    return badRequest('Username is required');
  }
  if (!body.password || typeof body.password !== 'string') {
    return badRequest('Password is required');
  }

  const { username, password } = body;

  // 验证输入长度（防止 DoS 攻击）
  const usernameValidation = validateStringLength(username, 'username');
  if (!usernameValidation.valid) {
    return badRequest(usernameValidation.message || 'Invalid username');
  }

  const passwordValidation = validateStringLength(password, 'password');
  if (!passwordValidation.valid) {
    return badRequest(passwordValidation.message || 'Invalid password');
  }

  try {
    // 查询管理员
    const result = await env.DB.prepare(
      'SELECT id, username, password_hash FROM admins WHERE username = ?'
    )
      .bind(username)
      .first<Admin>();

    // 用户不存在
    if (!result) {
      return unauthorized('Invalid username or password');
    }

    // 验证密码
    const isValidPassword = await compare(password, result.password_hash);
    if (!isValidPassword) {
      return unauthorized('Invalid username or password');
    }

    // 签发 JWT 令牌
    const token = await signToken(
      { sub: String(result.id), username: result.username },
      env.JWT_SECRET
    );

    // 计算过期时间戳
    const expiresAt = Math.floor(Date.now() / 1000) + getTokenExpirationSeconds();

    const response: LoginResponse = {
      token,
      expiresAt,
    };

    return success(response);
  } catch (error) {
    console.error('Login error:', error);
    return internalError('An error occurred during login');
  }
}
