/**
 * 中间件模块导出
 * 
 * 统一导出所有中间件，方便在其他模块中引用
 */

// 认证中间件
export {
  authMiddleware,
  extractBearerToken,
  isAuthSuccess,
  type AuthResult,
} from './auth';

// CORS 中间件
export {
  corsMiddleware,
  handlePreflight,
  addCORSHeaders,
  getCORSHeaders,
  defaultCORSConfig,
  type CORSConfig,
} from './cors';

// 安全中间件
export {
  securityMiddleware,
  addSecurityHeaders,
  checkRequestBodySize,
  checkRateLimit,
  getClientIP,
  validateStringLength,
  sanitizeString,
  isSafeUrl,
  generateSecureToken,
  clearRateLimitStore,
  SECURITY_HEADERS,
  MAX_REQUEST_BODY_SIZE,
  MAX_UPLOAD_SIZE,
  INPUT_LIMITS,
  type RateLimitConfig,
} from './security';
