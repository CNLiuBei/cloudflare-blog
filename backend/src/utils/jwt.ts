/**
 * JWT 认证工具模块
 * 
 * 使用 jose 库实现 JWT 令牌的签发和验证
 * 
 * 需求: 1.1, 1.5
 * - 使用安全的密钥签名
 * - 令牌有效期为 24 小时
 */

import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import type { JWTPayload } from '../models/types';

/**
 * JWT 令牌有效期（24 小时，单位：秒）
 */
const TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * 将字符串密钥转换为 Uint8Array 格式
 * jose 库需要 Uint8Array 格式的密钥
 * 
 * @param secret - 字符串格式的密钥
 * @returns Uint8Array 格式的密钥
 */
function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * 签发 JWT 令牌
 * 
 * 使用 HS256 算法签名，设置 24 小时有效期
 * 
 * @param payload - JWT 载荷，包含 sub（用户ID）和 username
 * @param secret - 用于签名的密钥
 * @returns 签名后的 JWT 令牌字符串
 * 
 * @example
 * ```typescript
 * const token = await signToken(
 *   { sub: '1', username: 'admin' },
 *   'your-secret-key'
 * );
 * ```
 */
export async function signToken(
  payload: Pick<JWTPayload, 'sub' | 'username'>,
  secret: string
): Promise<string> {
  const secretKey = getSecretKey(secret);
  const now = Math.floor(Date.now() / 1000);
  
  const token = await new SignJWT({
    sub: payload.sub,
    username: payload.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_EXPIRATION_SECONDS)
    .sign(secretKey);
  
  return token;
}

/**
 * 验证 JWT 令牌
 * 
 * 验证令牌的签名和有效期，返回解码后的载荷
 * 
 * @param token - 要验证的 JWT 令牌字符串
 * @param secret - 用于验证签名的密钥
 * @returns 解码后的 JWT 载荷，验证失败时返回 null
 * 
 * @example
 * ```typescript
 * const payload = await verifyToken(token, 'your-secret-key');
 * if (payload) {
 *   console.log('User ID:', payload.sub);
 *   console.log('Username:', payload.username);
 * } else {
 *   console.log('Token is invalid or expired');
 * }
 * ```
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const secretKey = getSecretKey(secret);
    
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    
    // 验证必要字段存在
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    
    return {
      sub: payload.sub,
      username: payload.username as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    // 签名无效、令牌过期或格式错误
    return null;
  }
}

/**
 * 获取令牌有效期（秒）
 * 
 * @returns 令牌有效期秒数
 */
export function getTokenExpirationSeconds(): number {
  return TOKEN_EXPIRATION_SECONDS;
}
