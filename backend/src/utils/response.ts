/**
 * 统一 API 响应格式工具
 * 实现需求 11.4 和 11.5：统一的 JSON 响应格式
 */

/**
 * API 响应接口
 * 成功时包含 data，失败时包含 error
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

/**
 * 错误码枚举
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFLICT = 'CONFLICT',
}

/**
 * 创建成功响应
 * @param data 响应数据
 * @param status HTTP 状态码，默认 200
 * @returns Response 对象
 * 
 * 验证: 需求 11.4 - API 请求成功时返回统一的 JSON 响应格式
 */
export function success<T>(data: T, status: number = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 创建错误响应
 * @param code 错误码
 * @param message 错误信息
 * @param status HTTP 状态码
 * @param details 可选的详细错误信息
 * @returns Response 对象
 * 
 * 验证: 需求 11.5 - API 请求失败时返回包含错误码和错误信息的 JSON 响应
 */
export function error(
  code: string,
  message: string,
  status: number,
  details?: Record<string, string>
): Response {
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 创建 401 未授权错误响应
 * @param message 错误信息，默认为 "Unauthorized"
 */
export function unauthorized(message: string = 'Unauthorized'): Response {
  return error(ErrorCode.UNAUTHORIZED, message, 401);
}

/**
 * 创建 403 禁止访问错误响应
 * @param message 错误信息，默认为 "Forbidden"
 */
export function forbidden(message: string = 'Forbidden'): Response {
  return error(ErrorCode.FORBIDDEN, message, 403);
}

/**
 * 创建 404 未找到错误响应
 * @param message 错误信息，默认为 "Not Found"
 */
export function notFound(message: string = 'Not Found'): Response {
  return error(ErrorCode.NOT_FOUND, message, 404);
}

/**
 * 创建 400 错误请求响应
 * @param message 错误信息，默认为 "Bad Request"
 */
export function badRequest(message: string = 'Bad Request'): Response {
  return error(ErrorCode.BAD_REQUEST, message, 400);
}

/**
 * 创建 400 验证错误响应
 * @param message 错误信息
 * @param details 字段级别的错误详情
 */
export function validationError(
  message: string,
  details?: Record<string, string>
): Response {
  return error(ErrorCode.VALIDATION_ERROR, message, 400, details);
}

/**
 * 创建 409 冲突错误响应
 * @param message 错误信息，默认为 "Conflict"
 */
export function conflict(message: string = 'Conflict'): Response {
  return error(ErrorCode.CONFLICT, message, 409);
}

/**
 * 创建 500 内部服务器错误响应
 * @param message 错误信息，默认为 "Internal Server Error"
 */
export function internalError(message: string = 'Internal Server Error'): Response {
  return error(ErrorCode.INTERNAL_ERROR, message, 500);
}

/**
 * 创建 429 请求过多错误响应
 * @param message 错误信息，默认为 "Too Many Requests"
 * @param retryAfter 重试等待时间（秒）
 */
export function tooManyRequests(
  message: string = 'Too Many Requests',
  retryAfter?: number
): Response {
  const response = error('TOO_MANY_REQUESTS', message, 429);
  
  if (retryAfter) {
    const headers = new Headers(response.headers);
    headers.set('Retry-After', String(retryAfter));
    return new Response(response.body, {
      status: 429,
      headers,
    });
  }
  
  return response;
}

/**
 * 创建 413 请求体过大错误响应
 * @param message 错误信息，默认为 "Payload Too Large"
 */
export function payloadTooLarge(message: string = 'Payload Too Large'): Response {
  return error('PAYLOAD_TOO_LARGE', message, 413);
}
