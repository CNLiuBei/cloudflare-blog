/**
 * 输入验证工具函数
 * 用于验证 API 请求中的数据
 */

import type {
  ArticleFormData,
  CategoryFormData,
  TagFormData,
  LoginRequest,
  ArticleStatus,
} from '../models/types';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * 创建成功的验证结果
 */
function validResult(): ValidationResult {
  return { valid: true, errors: {} };
}

/**
 * 创建失败的验证结果
 */
function invalidResult(errors: Record<string, string>): ValidationResult {
  return { valid: false, errors };
}

/**
 * 验证字符串是否为空或仅包含空白字符
 */
function isEmptyString(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

/**
 * 验证字符串长度是否在指定范围内
 */
function isValidLength(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

/**
 * 验证 slug 格式（只允许小写字母、数字和连字符）
 */
function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/**
 * 验证文章状态
 */
function isValidArticleStatus(status: unknown): status is ArticleStatus {
  return status === 'draft' || status === 'published';
}

/**
 * 验证文章数据
 * @param data 文章表单数据
 * @returns 验证结果
 */
export function validateArticle(data: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data || typeof data !== 'object') {
    return invalidResult({ _form: 'Invalid request body' });
  }
  
  const article = data as Partial<ArticleFormData>;
  
  // 验证标题
  if (isEmptyString(article.title)) {
    errors.title = 'Title is required';
  } else if (!isValidLength(article.title!, 1, 200)) {
    errors.title = 'Title must be between 1 and 200 characters';
  }
  
  // 验证内容
  if (isEmptyString(article.content)) {
    errors.content = 'Content is required';
  }
  
  // 验证状态
  if (article.status !== undefined && !isValidArticleStatus(article.status)) {
    errors.status = 'Status must be either "draft" or "published"';
  }
  
  // 验证分类 ID（如果提供）
  if (article.category_id !== undefined && article.category_id !== null) {
    if (typeof article.category_id !== 'number' || article.category_id < 1) {
      errors.category_id = 'Category ID must be a positive number';
    }
  }
  
  // 验证标签 ID 数组（如果提供）
  if (article.tag_ids !== undefined && article.tag_ids !== null) {
    if (!Array.isArray(article.tag_ids)) {
      errors.tag_ids = 'Tag IDs must be an array';
    } else if (!article.tag_ids.every(id => typeof id === 'number' && id > 0)) {
      errors.tag_ids = 'All tag IDs must be positive numbers';
    }
  }
  
  // 验证描述长度（如果提供）
  if (article.description !== undefined && article.description !== null) {
    if (typeof article.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (article.description.length > 500) {
      errors.description = 'Description must not exceed 500 characters';
    }
  }
  
  // 验证关键词长度（如果提供）
  if (article.keywords !== undefined && article.keywords !== null) {
    if (typeof article.keywords !== 'string') {
      errors.keywords = 'Keywords must be a string';
    } else if (article.keywords.length > 200) {
      errors.keywords = 'Keywords must not exceed 200 characters';
    }
  }
  
  return Object.keys(errors).length === 0 ? validResult() : invalidResult(errors);
}

/**
 * 验证分类数据
 * @param data 分类表单数据
 * @returns 验证结果
 */
export function validateCategory(data: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data || typeof data !== 'object') {
    return invalidResult({ _form: 'Invalid request body' });
  }
  
  const category = data as Partial<CategoryFormData>;
  
  // 验证名称
  if (isEmptyString(category.name)) {
    errors.name = 'Name is required';
  } else if (!isValidLength(category.name!, 1, 50)) {
    errors.name = 'Name must be between 1 and 50 characters';
  }
  
  // 验证 slug
  if (isEmptyString(category.slug)) {
    errors.slug = 'Slug is required';
  } else if (!isValidSlug(category.slug!)) {
    errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
  } else if (!isValidLength(category.slug!, 1, 50)) {
    errors.slug = 'Slug must be between 1 and 50 characters';
  }
  
  // 验证描述长度（如果提供）
  if (category.description !== undefined && category.description !== null) {
    if (typeof category.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (category.description.length > 200) {
      errors.description = 'Description must not exceed 200 characters';
    }
  }
  
  return Object.keys(errors).length === 0 ? validResult() : invalidResult(errors);
}

/**
 * 验证标签数据
 * @param data 标签表单数据
 * @returns 验证结果
 */
export function validateTag(data: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data || typeof data !== 'object') {
    return invalidResult({ _form: 'Invalid request body' });
  }
  
  const tag = data as Partial<TagFormData>;
  
  // 验证名称
  if (isEmptyString(tag.name)) {
    errors.name = 'Name is required';
  } else if (!isValidLength(tag.name!, 1, 30)) {
    errors.name = 'Name must be between 1 and 30 characters';
  }
  
  // 验证 slug
  if (isEmptyString(tag.slug)) {
    errors.slug = 'Slug is required';
  } else if (!isValidSlug(tag.slug!)) {
    errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
  } else if (!isValidLength(tag.slug!, 1, 30)) {
    errors.slug = 'Slug must be between 1 and 30 characters';
  }
  
  return Object.keys(errors).length === 0 ? validResult() : invalidResult(errors);
}

/**
 * 验证登录数据
 * @param data 登录请求数据
 * @returns 验证结果
 */
export function validateLogin(data: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data || typeof data !== 'object') {
    return invalidResult({ _form: 'Invalid request body' });
  }
  
  const login = data as Partial<LoginRequest>;
  
  // 验证用户名
  if (isEmptyString(login.username)) {
    errors.username = 'Username is required';
  } else if (!isValidLength(login.username!, 1, 50)) {
    errors.username = 'Username must be between 1 and 50 characters';
  }
  
  // 验证密码
  if (isEmptyString(login.password)) {
    errors.password = 'Password is required';
  } else if (!isValidLength(login.password!, 1, 100)) {
    errors.password = 'Password must be between 1 and 100 characters';
  }
  
  return Object.keys(errors).length === 0 ? validResult() : invalidResult(errors);
}

/**
 * 验证分页参数
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 验证结果
 */
export function validatePagination(
  page?: number | string,
  pageSize?: number | string
): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (page !== undefined) {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum) || pageNum < 1) {
      errors.page = 'Page must be a positive integer';
    }
  }
  
  if (pageSize !== undefined) {
    const sizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;
    if (isNaN(sizeNum) || sizeNum < 1 || sizeNum > 100) {
      errors.pageSize = 'Page size must be between 1 and 100';
    }
  }
  
  return Object.keys(errors).length === 0 ? validResult() : invalidResult(errors);
}

/**
 * 验证 ID 参数
 * @param id ID 值
 * @param fieldName 字段名称（用于错误消息）
 * @returns 验证结果
 */
export function validateId(
  id: unknown,
  fieldName: string = 'ID'
): ValidationResult {
  const errors: Record<string, string> = {};
  
  const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
  
  if (typeof idNum !== 'number' || isNaN(idNum) || idNum < 1) {
    errors[fieldName.toLowerCase()] = `${fieldName} must be a positive integer`;
  }
  
  return Object.keys(errors).length === 0 ? validResult() : invalidResult(errors);
}

/**
 * 验证图片文件类型
 * @param contentType 文件的 Content-Type
 * @returns 是否为有效的图片类型
 */
export function isValidImageType(contentType: string): boolean {
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];
  return validTypes.includes(contentType.toLowerCase());
}

/**
 * 验证文件大小
 * @param size 文件大小（字节）
 * @param maxSize 最大允许大小（字节），默认 10MB
 * @returns 是否在允许范围内
 */
export function isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}
