/**
 * CORS 中间件
 * 
 * 处理跨域资源共享（Cross-Origin Resource Sharing）
 * 支持 OPTIONS 预检请求和响应头设置
 */

/**
 * CORS 配置接口
 */
export interface CORSConfig {
  /** 允许的源列表，使用 '*' 表示允许所有源 */
  allowOrigins: string[];
  /** 允许的 HTTP 方法列表 */
  allowMethods: string[];
  /** 允许的请求头列表 */
  allowHeaders: string[];
  /** 预检请求缓存时间（秒） */
  maxAge?: number;
  /** 是否允许携带凭证（cookies） */
  allowCredentials?: boolean;
}

/**
 * 默认 CORS 配置
 */
export const defaultCORSConfig: CORSConfig = {
  allowOrigins: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 小时
  allowCredentials: false,
};

/**
 * 获取 CORS 响应头
 * 
 * @param origin - 请求的 Origin 头
 * @param config - CORS 配置，默认使用 defaultCORSConfig
 * @returns CORS 响应头对象
 */
export function getCORSHeaders(
  origin: string | null,
  config: CORSConfig = defaultCORSConfig
): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // 设置 Access-Control-Allow-Origin
  if (config.allowOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && config.allowOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    // 当指定具体源时，需要设置 Vary 头
    headers['Vary'] = 'Origin';
  }
  
  // 设置 Access-Control-Allow-Methods
  headers['Access-Control-Allow-Methods'] = config.allowMethods.join(', ');
  
  // 设置 Access-Control-Allow-Headers
  headers['Access-Control-Allow-Headers'] = config.allowHeaders.join(', ');
  
  // 设置 Access-Control-Max-Age（预检请求缓存时间）
  if (config.maxAge !== undefined) {
    headers['Access-Control-Max-Age'] = config.maxAge.toString();
  }
  
  // 设置 Access-Control-Allow-Credentials
  if (config.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

/**
 * 处理 OPTIONS 预检请求
 * 
 * 返回带有 CORS 头的 204 No Content 响应
 * 
 * @param request - HTTP 请求对象
 * @param config - CORS 配置，默认使用 defaultCORSConfig
 * @returns 预检响应
 * 
 * @example
 * ```typescript
 * // 在路由处理中使用
 * if (request.method === 'OPTIONS') {
 *   return handlePreflight(request);
 * }
 * ```
 */
export function handlePreflight(
  request: Request,
  config: CORSConfig = defaultCORSConfig
): Response {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCORSHeaders(origin, config);
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * 为响应添加 CORS 头
 * 
 * 创建一个新的 Response 对象，包含原始响应的内容和 CORS 头
 * 
 * @param response - 原始响应对象
 * @param request - HTTP 请求对象（用于获取 Origin）
 * @param config - CORS 配置，默认使用 defaultCORSConfig
 * @returns 带有 CORS 头的新响应对象
 * 
 * @example
 * ```typescript
 * // 在返回响应前添加 CORS 头
 * const response = success({ message: 'Hello' });
 * return addCORSHeaders(response, request);
 * ```
 */
export function addCORSHeaders(
  response: Response,
  request: Request,
  config: CORSConfig = defaultCORSConfig
): Response {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCORSHeaders(origin, config);
  
  // 创建新的响应，合并原有头和 CORS 头
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * CORS 中间件
 * 
 * 处理 CORS 预检请求和为响应添加 CORS 头
 * 
 * @param request - HTTP 请求对象
 * @param handler - 实际的请求处理函数
 * @param config - CORS 配置，默认使用 defaultCORSConfig
 * @returns 带有 CORS 头的响应
 * 
 * @example
 * ```typescript
 * // 在 Worker 入口中使用
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     return corsMiddleware(request, async () => {
 *       // 实际的路由处理逻辑
 *       return handleRequest(request, env);
 *     });
 *   }
 * };
 * ```
 */
export async function corsMiddleware(
  request: Request,
  handler: () => Promise<Response>,
  config: CORSConfig = defaultCORSConfig
): Promise<Response> {
  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return handlePreflight(request, config);
  }
  
  // 执行实际的请求处理
  const response = await handler();
  
  // 为响应添加 CORS 头
  return addCORSHeaders(response, request, config);
}
