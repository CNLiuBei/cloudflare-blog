/**
 * JWT 认证中间件
 * 
 * 验证请求中的 JWT 令牌，保护需要认证的 API 端点
 * 
 * 需求: 1.3, 1.4, 11.6
 * - 1.3: 携带有效 JWT 的请求应该被允许访问
 * - 1.4: 携带无效或过期 JWT 的请求应该返回 401 错误
 * - 11.6: 实现 JWT 中间件验证受保护的 API 端点
 */

import type { Env, JWTPayload } from '../models/types';
import { verifyToken } from '../utils/jwt';
import { unauthorized } from '../utils/response';

/**
 * 认证中间件结果类型
 * 成功时返回包含用户信息的对象，失败时返回 401 Response
 */
export type AuthResult = { user: JWTPayload } | Response;

/**
 * 从 Authorization header 中提取 Bearer token
 * 
 * @param authHeader - Authorization header 值
 * @returns 提取的 token 字符串，如果格式不正确则返回 null
 * 
 * @example
 * ```typescript
 * const token = extractBearerToken('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * // token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 * 
 * const invalid = extractBearerToken('Basic dXNlcjpwYXNz');
 * // invalid = null
 * ```
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }
  
  // 检查是否以 "Bearer " 开头（不区分大小写）
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return null;
  }
  
  // 提取 token 部分
  const token = authHeader.slice(bearerPrefix.length).trim();
  
  // 确保 token 不为空
  if (!token) {
    return null;
  }
  
  return token;
}

/**
 * JWT 认证中间件
 * 
 * 从请求的 Authorization header 中提取并验证 JWT 令牌。
 * 如果令牌有效，返回包含用户信息的对象；
 * 如果令牌无效、过期或缺失，返回 401 错误响应。
 * 
 * @param request - HTTP 请求对象
 * @param env - Cloudflare Workers 环境绑定，包含 JWT_SECRET
 * @returns 成功时返回 { user: JWTPayload }，失败时返回 401 Response
 * 
 * @example
 * ```typescript
 * // 在路由处理器中使用
 * async function handleProtectedRoute(request: Request, env: Env) {
 *   const authResult = await authMiddleware(request, env);
 *   
 *   // 检查是否为 Response（认证失败）
 *   if (authResult instanceof Response) {
 *     return authResult;
 *   }
 *   
 *   // 认证成功，可以访问用户信息
 *   const { user } = authResult;
 *   console.log('Authenticated user:', user.username);
 *   
 *   // 继续处理请求...
 * }
 * ```
 */
export async function authMiddleware(
  request: Request,
  env: Env
): Promise<AuthResult> {
  // 1. 从 Authorization header 中提取 Bearer token
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);
  
  // 2. 检查 token 是否存在
  if (!token) {
    return unauthorized('Missing or invalid authorization header');
  }
  
  // 3. 验证 token
  const payload = await verifyToken(token, env.JWT_SECRET);
  
  // 4. 检查验证结果
  if (!payload) {
    return unauthorized('Invalid or expired token');
  }
  
  // 5. 返回用户信息
  return { user: payload };
}

/**
 * 检查认证结果是否为成功（包含用户信息）
 * 
 * 类型守卫函数，用于在 TypeScript 中安全地区分认证成功和失败的情况
 * 
 * @param result - 认证中间件的返回结果
 * @returns 如果认证成功返回 true，否则返回 false
 * 
 * @example
 * ```typescript
 * const result = await authMiddleware(request, env);
 * if (isAuthSuccess(result)) {
 *   // TypeScript 知道 result 是 { user: JWTPayload }
 *   console.log(result.user.username);
 * } else {
 *   // TypeScript 知道 result 是 Response
 *   return result;
 * }
 * ```
 */
export function isAuthSuccess(result: AuthResult): result is { user: JWTPayload } {
  return !(result instanceof Response);
}
