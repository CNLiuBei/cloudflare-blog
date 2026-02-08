/**
 * 标签处理器
 * 
 * 实现标签 CRUD API
 * 
 * 需求: 5.1, 5.3, 5.4
 * - GET /api/tags: 获取所有标签
 * - POST /api/admin/tag: 创建标签
 * - DELETE /api/admin/tag/:id: 删除标签（级联删除 article_tags 关联）
 */

import { success, notFound, badRequest, conflict, internalError } from '../utils/response';
import type { Env } from '../types/env';
import type { Tag, TagFormData } from '../models/types';

/**
 * 获取所有标签
 * 
 * GET /api/tags
 */
export async function handleGetTags(
  _request: Request,
  env: Env
): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      'SELECT id, name, slug, created_at FROM tags ORDER BY created_at DESC'
    ).all<Tag>();

    return success(result.results || []);
  } catch (error) {
    console.error('Get tags error:', error);
    return internalError('Failed to fetch tags');
  }
}

/**
 * 获取单个标签
 * 
 * GET /api/tag/:id
 */
export async function handleGetTag(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    const tag = await env.DB.prepare(
      'SELECT id, name, slug, created_at FROM tags WHERE id = ?'
    )
      .bind(id)
      .first<Tag>();

    if (!tag) {
      return notFound('Tag not found');
    }

    return success(tag);
  } catch (error) {
    console.error('Get tag error:', error);
    return internalError('Failed to fetch tag');
  }
}

/**
 * 创建标签
 * 
 * POST /api/admin/tag
 * 
 * 验证: 需求 5.1 - 创建标签保存到数据库
 */
export async function handleCreateTag(
  request: Request,
  env: Env
): Promise<Response> {
  // 解析请求体
  let body: TagFormData;
  try {
    body = await request.json() as TagFormData;
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

  const { name, slug } = body;

  try {
    // 检查 slug 是否已存在
    const existing = await env.DB.prepare(
      'SELECT id FROM tags WHERE slug = ?'
    )
      .bind(slug)
      .first();

    if (existing) {
      return conflict('Tag with this slug already exists');
    }

    // 插入新标签
    const result = await env.DB.prepare(
      'INSERT INTO tags (name, slug) VALUES (?, ?) RETURNING id, name, slug, created_at'
    )
      .bind(name.trim(), slug.trim())
      .first<Tag>();

    return success(result, 201);
  } catch (error) {
    console.error('Create tag error:', error);
    return internalError('Failed to create tag');
  }
}

/**
 * 删除标签
 * 
 * DELETE /api/admin/tag/:id
 * 
 * 验证: 需求 5.3 - 删除标签时同时删除 article_tags 关联记录
 * 注意: article_tags 表设置了 ON DELETE CASCADE，会自动级联删除
 */
export async function handleDeleteTag(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    // 检查标签是否存在
    const existing = await env.DB.prepare(
      'SELECT id FROM tags WHERE id = ?'
    )
      .bind(id)
      .first();

    if (!existing) {
      return notFound('Tag not found');
    }

    // 删除标签（article_tags 关联会通过 CASCADE 自动删除）
    await env.DB.prepare('DELETE FROM tags WHERE id = ?')
      .bind(id)
      .run();

    return success({ deleted: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    return internalError('Failed to delete tag');
  }
}
