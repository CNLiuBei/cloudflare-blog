/**
 * API 模块统一导出
 */

export { default as api, ApiError, getToken, setToken, clearToken, isAuthenticated } from './client';
export { default as authApi } from './auth';
export { default as articlesApi } from './articles';
export { default as categoriesApi } from './categories';
export { default as tagsApi } from './tags';
export { default as uploadApi } from './upload';

// 类型导出
export type {
  Article,
  ArticleFormData,
  ArticleListParams,
  ArticleStatus,
  Category,
  CategoryFormData,
  Tag,
  TagFormData,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  UploadResponse,
} from './types';
