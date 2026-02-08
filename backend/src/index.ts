/**
 * Cloudflare Workers 博客系统后端入口
 * 
 * 此文件是 Workers 的主入口点，负责路由分发和中间件配置
 * 
 * 需求: 11.1, 11.2, 11.3, 11.6
 */

import { Env } from './types/env';
import { corsMiddleware, authMiddleware, isAuthSuccess } from './middleware';
import { success, notFound } from './utils/response';
import { 
  securityMiddleware, 
  checkRateLimit, 
  getClientIP,
  checkRequestBodySize,
  MAX_REQUEST_BODY_SIZE,
  MAX_UPLOAD_SIZE
} from './middleware/security';
import { tooManyRequests, payloadTooLarge } from './utils/response';

// 处理器导入
import { handleLogin } from './handlers/auth';
import { 
  handleGetCategories, 
  handleGetCategory,
  handleCreateCategory, 
  handleUpdateCategory, 
  handleDeleteCategory 
} from './handlers/categories';
import { 
  handleGetTags, 
  handleGetTag,
  handleCreateTag, 
  handleDeleteTag 
} from './handlers/tags';
import { 
  handleGetArticles, 
  handleGetAdminArticles,
  handleGetArticle, 
  handleGetAdminArticle,
  handleCreateArticle, 
  handleUpdateArticle, 
  handleDeleteArticle,
  handleLikeArticle,
  handlePinArticle
} from './handlers/articles';
import { handleUpload } from './handlers/upload';

/**
 * 从 URL 路径中提取 ID 参数
 */
function extractIdFromPath(pathname: string, prefix: string): number | null {
  const match = pathname.match(new RegExp(`^${prefix}/(\\d+)$`));
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 主路由处理函数
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  // ==================== 公开 API ====================

  // POST /api/login - 管理员登录（带速率限制）
  if (pathname === '/api/login' && method === 'POST') {
    // 速率限制：每 IP 每分钟最多 5 次登录尝试
    const clientIP = getClientIP(request);
    const rateLimitKey = `login:${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 5, windowMs: 60000 });
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return tooManyRequests('Too many login attempts. Please try again later.', retryAfter);
    }
    
    // 检查请求体大小
    const bodyCheck = await checkRequestBodySize(request, MAX_REQUEST_BODY_SIZE);
    if (!bodyCheck.valid) {
      return payloadTooLarge('Request body too large');
    }
    
    return handleLogin(request, env);
  }

  // GET /api/articles - 获取文章列表（仅已发布）
  if (pathname === '/api/articles' && method === 'GET') {
    return handleGetArticles(request, env);
  }

  // GET /api/article/:id - 获取文章详情（仅已发布）
  const articleId = extractIdFromPath(pathname, '/api/article');
  if (articleId !== null && method === 'GET') {
    return handleGetArticle(request, env, articleId);
  }

  // POST /api/article/:id/like - 点赞文章
  const likeMatch = pathname.match(/^\/api\/article\/(\d+)\/like$/);
  if (likeMatch && method === 'POST') {
    const likeArticleId = parseInt(likeMatch[1], 10);
    return handleLikeArticle(request, env, likeArticleId);
  }

  // GET /api/categories - 获取分类列表
  if (pathname === '/api/categories' && method === 'GET') {
    return handleGetCategories(request, env);
  }

  // GET /api/category/:id - 获取单个分类
  const categoryId = extractIdFromPath(pathname, '/api/category');
  if (categoryId !== null && method === 'GET') {
    return handleGetCategory(request, env, categoryId);
  }

  // GET /api/tags - 获取标签列表
  if (pathname === '/api/tags' && method === 'GET') {
    return handleGetTags(request, env);
  }

  // GET /api/tag/:id - 获取单个标签
  const tagId = extractIdFromPath(pathname, '/api/tag');
  if (tagId !== null && method === 'GET') {
    return handleGetTag(request, env, tagId);
  }

  // ==================== 受保护的管理 API ====================

  // 检查是否为管理 API 路径
  if (pathname.startsWith('/api/admin/') || pathname === '/api/upload') {
    // 验证 JWT
    const authResult = await authMiddleware(request, env);
    if (!isAuthSuccess(authResult)) {
      return authResult; // 返回 401 响应
    }

    // POST /api/upload - 上传图片
    if (pathname === '/api/upload' && method === 'POST') {
      // 检查上传文件大小
      const bodyCheck = await checkRequestBodySize(request, MAX_UPLOAD_SIZE);
      if (!bodyCheck.valid) {
        return payloadTooLarge('File too large. Maximum size: 10MB');
      }
      return handleUpload(request, env);
    }

    // ========== 文章管理 ==========

    // GET /api/admin/articles - 获取文章列表（包含草稿）
    if (pathname === '/api/admin/articles' && method === 'GET') {
      return handleGetAdminArticles(request, env);
    }

    // POST /api/admin/article - 创建文章
    if (pathname === '/api/admin/article' && method === 'POST') {
      return handleCreateArticle(request, env);
    }

    // GET/PUT/DELETE /api/admin/article/:id
    const adminArticleId = extractIdFromPath(pathname, '/api/admin/article');
    if (adminArticleId !== null) {
      if (method === 'GET') {
        return handleGetAdminArticle(request, env, adminArticleId);
      }
      if (method === 'PUT') {
        return handleUpdateArticle(request, env, adminArticleId);
      }
      if (method === 'DELETE') {
        return handleDeleteArticle(request, env, adminArticleId);
      }
    }

    // POST /api/admin/article/:id/pin - 置顶文章
    const pinMatch = pathname.match(/^\/api\/admin\/article\/(\d+)\/pin$/);
    if (pinMatch && method === 'POST') {
      const pinArticleId = parseInt(pinMatch[1], 10);
      return handlePinArticle(request, env, pinArticleId);
    }

    // ========== 分类管理 ==========

    // POST /api/admin/category - 创建分类
    if (pathname === '/api/admin/category' && method === 'POST') {
      return handleCreateCategory(request, env);
    }

    // PUT/DELETE /api/admin/category/:id
    const adminCategoryId = extractIdFromPath(pathname, '/api/admin/category');
    if (adminCategoryId !== null) {
      if (method === 'PUT') {
        return handleUpdateCategory(request, env, adminCategoryId);
      }
      if (method === 'DELETE') {
        return handleDeleteCategory(request, env, adminCategoryId);
      }
    }

    // ========== 标签管理 ==========

    // POST /api/admin/tag - 创建标签
    if (pathname === '/api/admin/tag' && method === 'POST') {
      return handleCreateTag(request, env);
    }

    // DELETE /api/admin/tag/:id
    const adminTagId = extractIdFromPath(pathname, '/api/admin/tag');
    if (adminTagId !== null && method === 'DELETE') {
      return handleDeleteTag(request, env, adminTagId);
    }
  }

  // ==================== 健康检查 ====================
  if (pathname === '/api/health' && method === 'GET') {
    return success({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== 404 ====================
  return notFound('Endpoint not found');
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // 使用 CORS 中间件包装所有请求，然后添加安全头
    return corsMiddleware(request, async () => {
      const response = await handleRequest(request, env);
      return securityMiddleware(request, async () => response);
    });
  }
};
