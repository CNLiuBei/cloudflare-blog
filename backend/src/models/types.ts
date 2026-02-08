/**
 * 数据类型定义
 * 定义博客系统中所有核心数据模型的 TypeScript 接口
 */

/**
 * 管理员实体
 */
export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

/**
 * 分类实体
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

/**
 * 标签实体
 */
export interface Tag {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

/**
 * 文章状态类型
 */
export type ArticleStatus = 'draft' | 'published';

/**
 * 文章实体
 */
export interface Article {
  id: number;
  title: string;
  content: string;
  cover?: string;
  category_id?: number;
  description?: string;
  keywords?: string;
  status: ArticleStatus;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  // 关联数据
  category?: Category;
  tags?: Tag[];
}

/**
 * 文章表单数据（用于创建和更新）
 */
export interface ArticleFormData {
  title: string;
  content: string;
  cover?: string;
  category_id?: number;
  description?: string;
  keywords?: string;
  status: ArticleStatus;
  tag_ids?: number[];
}

/**
 * 文章列表查询参数
 */
export interface ArticleListParams {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  tagId?: number;
  status?: ArticleStatus;
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 登录请求数据
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  token: string;
  expiresAt: number;
}

/**
 * 上传响应数据
 */
export interface UploadResponse {
  url: string;
  filename: string;
}

/**
 * 分类表单数据
 */
export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
}

/**
 * 标签表单数据
 */
export interface TagFormData {
  name: string;
  slug: string;
}

/**
 * JWT 载荷
 */
export interface JWTPayload {
  sub: string;      // 用户 ID
  username: string;
  iat: number;      // 签发时间
  exp: number;      // 过期时间
}

// 注意：Env 类型定义在 types/env.ts 中，这里重新导出以保持兼容性
export type { Env } from '../types/env';
