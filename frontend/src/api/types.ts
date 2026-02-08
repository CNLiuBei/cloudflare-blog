/**
 * API 类型定义
 */

// 文章状态
export type ArticleStatus = 'draft' | 'published';

// 分类
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

// 标签
export interface Tag {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

// 文章
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
  category?: Category;
  tags?: Tag[];
  relatedArticles?: RelatedArticle[];
}

// 相关文章（简化版）
export interface RelatedArticle {
  id: number;
  title: string;
  cover?: string;
  description?: string;
  view_count: number;
  created_at: string;
}

// 文章表单数据
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

// 分类表单数据
export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
}

// 标签表单数据
export interface TagFormData {
  name: string;
  slug: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 文章列表查询参数
export interface ArticleListParams {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  tagId?: number;
  status?: ArticleStatus;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  expiresAt: number;
}

// 上传响应
export interface UploadResponse {
  url: string;
  filename: string;
}
