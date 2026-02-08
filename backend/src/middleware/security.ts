/**
 * 安全中间件
 * 
 * 提供安全响应头、请求限制和输入清理功能
 */

/**
 * 安全响应头配置
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * 请求体大小限制（字节）
 */
export const MAX_REQUEST_BODY_SIZE = 1024 * 1024; // 1MB for JSON requests
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB for file uploads

/**
 * 输入长度限制
 */
export const INPUT_LIMITS = {
  username: { min: 1, max: 50 },
  password: { min: 6, max: 100 },
  title: { min: 1, max: 200 },
  content: { min: 1, max: 100000 }, // 约 100KB 文本
  description: { min: 0, max: 500 },
  keywords: { min: 0, max: 200 },
  slug: { min: 1, max: 100 },
  name: { min: 1, max: 100 },
} as const;

/**
 * 为响应添加安全头
 */
export function addSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * 检查请求体大小
 */
export async function checkRequestBodySize(
  request: Request,
  maxSize: number = MAX_REQUEST_BODY_SIZE
): Promise<{ valid: boolean; size: number }> {
  const contentLength = request.headers.get('Content-Length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    return { valid: size <= maxSize, size };
  }
  
  // 如果没有 Content-Length，需要读取 body 来检查
  // 这里返回 valid: true，让后续处理来验证
  return { valid: true, size: 0 };
}

/**
 * 清理字符串输入（防止 XSS）
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 验证字符串长度
 */
export function validateStringLength(
  value: string,
  field: keyof typeof INPUT_LIMITS
): { valid: boolean; message?: string } {
  const limits = INPUT_LIMITS[field];
  const length = value.length;
  
  if (length < limits.min) {
    return { valid: false, message: `${field} must be at least ${limits.min} characters` };
  }
  
  if (length > limits.max) {
    return { valid: false, message: `${field} must not exceed ${limits.max} characters` };
  }
  
  return { valid: true };
}

/**
 * 检查是否为安全的 URL（防止 SSRF）
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // 只允许 http 和 https 协议
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // 禁止访问内网地址
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成安全的随机字符串
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  maxRequests: number;  // 时间窗口内最大请求数
  windowMs: number;     // 时间窗口（毫秒）
}

/**
 * 内存速率限制存储（适用于单实例）
 * 生产环境建议使用 KV 或 Durable Objects
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * 检查速率限制
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  // 清理过期记录
  if (record && now > record.resetTime) {
    rateLimitStore.delete(key);
  }
  
  const existing = rateLimitStore.get(key);
  
  if (!existing) {
    // 首次请求
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }
  
  if (existing.count >= config.maxRequests) {
    // 超过限制
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }
  
  // 增加计数
  existing.count++;
  return { 
    allowed: true, 
    remaining: config.maxRequests - existing.count, 
    resetTime: existing.resetTime 
  };
}

/**
 * 获取客户端 IP（用于速率限制）
 */
export function getClientIP(request: Request): string {
  // Cloudflare 提供的真实客户端 IP
  return request.headers.get('CF-Connecting-IP') 
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

/**
 * 安全中间件 - 包装响应添加安全头
 */
export async function securityMiddleware(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const response = await handler();
  return addSecurityHeaders(response);
}

/**
 * 清理速率限制存储（用于测试）
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
