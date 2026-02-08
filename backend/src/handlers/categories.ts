/**
 * 分类处理器
 * 
 * 实现分类 CRUD API
 * 
 * 需求: 4.1, 4.2, 4.3, 4.4, 4.5
 * - GET /api/categories: 获取所有分类
 * - POST /api/admin/category: 创建分类
 * - PUT /api/admin/category/:id: 更新分类
 * - DELETE /api/admin/category/:id: 删除分类（有关联文章时阻止删除）
 */

import { success, notFound, badRequest, conflict, internalError } from '../utils/response';
import type { Env } from '../types/env';
import type { Category, CategoryFormData } from '../models/types';

/**
 * 获取所有分类
 * 
 * GET /api/categories
 */
export async function handleGetCategories(
  _request: Request,
  env: Env
): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      'SELECT id, name, slug, description, created_at FROM categories ORDER BY created_at DESC'
    ).all<Category>();

    return success(result.results || []);
  } catch (error) {
    console.error('Get categories error:', error);
    return internalError('Failed to fetch categories');
  }
}

/**
 * 获取单个分类
 * 
 * GET /api/category/:id
 */
export async function handleGetCategory(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    const category = await env.DB.prepare(
      'SELECT id, name, slug, description, created_at FROM categories WHERE id = ?'
    )
      .bind(id)
      .first<Category>();

    if (!category) {
      return notFound('Category not found');
    }

    return success(category);
  } catch (error) {
    console.error('Get category error:', error);
    return internalError('Failed to fetch category');
  }
}

/**
 * 创建分类
 * 
 * POST /api/admin/category
 * 
 * 验证: 需求 4.1 - 创建分类保存到数据库
 */
export async function handleCreateCategory(
  request: Request,
  env: Env
): Promise<Response> {
  // 解析请求体
  let body: CategoryFormData;
  try {
    body = await request.json() as CategoryFormData;
  } catch {
    return badRequest('Invalid JSON body');
  }

  // 验证必填字段
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return badRequest('Name is required');
  }
  if (!body.slug || typeof body.slug !== 'string' || body.slug.trim() === '') {
    return badRequest('Slug is required');
  }

  const { name, slug, description } = body;

  try {
    // 检查 slug 是否已存在
    const existing = await env.DB.prepare(
      'SELECT id FROM categories WHERE slug = ?'
    )
      .bind(slug)
      .first();

    if (existing) {
      return conflict('Category with this slug already exists');
    }

    // 插入新分类
    const result = await env.DB.prepare(
      'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?) RETURNING id, name, slug, description, created_at'
    )
      .bind(name.trim(), slug.trim(), description?.trim() || null)
      .first<Category>();

    return success(result, 201);
  } catch (error) {
    console.error('Create category error:', error);
    return internalError('Failed to create category');
  }
}

/**
 * 更新分类
 * 
 * PUT /api/admin/category/:id
 * 
 * 验证: 需求 4.2 - 更新分类记录
 */
export async function handleUpdateCategory(
  request: Request,
  env: Env,
  id: number
): Promise<Response> {
  // 解析请求体
  let body: CategoryFormData;
  try {
    body = await request.json() as CategoryFormData;
  } catch {
    return badRequest('Invalid JSON body');
  }

  // 验证必填字段
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return badRequest('Name is required');
  }
  if (!body.slug || typeof body.slug !== 'string' || body.slug.trim() === '') {
    return badRequest('Slug is required');
  }

  const { name, slug, description } = body;

  try {
    // 检查分类是否存在
    const existing = await env.DB.prepare(
      'SELECT id FROM categories WHERE id = ?'
    )
      .bind(id)
      .first();

    if (!existing) {
      return notFound('Category not found');
    }

    // 检查 slug 是否被其他分类使用
    const slugConflict = await env.DB.prepare(
      'SELECT id FROM categories WHERE slug = ? AND id != ?'
    )
      .bind(slug, id)
      .first();

    if (slugConflict) {
      return conflict('Category with this slug already exists');
    }

    // 更新分类
    const result = await env.DB.prepare(
      'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ? RETURNING id, name, slug, description, created_at'
    )
      .bind(name.trim(), slug.trim(), description?.trim() || null, id)
      .first<Category>();

    return success(result);
  } catch (error) {
    console.error('Update category error:', error);
    return internalError('Failed to update category');
  }
}

/**
 * 删除分类
 * 
 * DELETE /api/admin/category/:id
 * 
 * 验证: 需求 4.3, 4.4 - 检查关联文章，有关联时阻止删除
 */
export async function handleDeleteCategory(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    // 检查分类是否存在
    const existing = await env.DB.prepare(
      'SELECT id FROM categories WHERE id = ?'
    )
      .bind(id)
      .first();

    if (!existing) {
      return notFound('Category not found');
    }

    // 检查是否有关联文章
    const articleCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE category_id = ?'
    )
      .bind(id)
      .first<{ count: number }>();

    if (articleCount && articleCount.count > 0) {
      return conflict(`Cannot delete category: ${articleCount.count} article(s) are using this category`);
    }

    // 删除分类
    await env.DB.prepare('DELETE FROM categories WHERE id = ?')
      .bind(id)
      .run();

    return success({ deleted: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return internalError('Failed to delete category');
  }
}
