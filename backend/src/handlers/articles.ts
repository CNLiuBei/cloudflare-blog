/**
 * 文章处理器
 * 
 * 实现文章 CRUD API
 * 
 * 需求: 2.2, 2.4, 2.5, 2.6, 5.2, 5.5, 6.1, 6.3, 6.4, 6.5
 */

import { success, notFound, badRequest, internalError } from '../utils/response';
import type { Env } from '../types/env';
import type { Article, ArticleFormData, ArticleListParams, PaginatedResponse, Category, Tag } from '../models/types';

const DEFAULT_PAGE_SIZE = 10;

/**
 * 获取文章列表（公开 API）
 * 
 * GET /api/articles
 * 
 * 验证: 需求 6.1, 6.5 - 仅返回已发布文章
 * 验证: 需求 6.3, 6.4 - 分页支持
 */
export async function handleGetArticles(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const params: ArticleListParams = {
    page: parseInt(url.searchParams.get('page') || '1'),
    pageSize: parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE)),
    categoryId: url.searchParams.get('categoryId') ? parseInt(url.searchParams.get('categoryId')!) : undefined,
    tagId: url.searchParams.get('tagId') ? parseInt(url.searchParams.get('tagId')!) : undefined,
  };

  // 验证分页参数
  if (params.page! < 1) params.page = 1;
  if (params.pageSize! < 1 || params.pageSize! > 100) params.pageSize = DEFAULT_PAGE_SIZE;

  try {
    let query = `
      SELECT DISTINCT a.id, a.title, a.content, a.cover, a.category_id, 
             a.description, a.keywords, a.status, a.view_count, a.like_count, a.created_at, a.updated_at
      FROM articles a
    `;
    const countQuery = params.tagId
      ? 'SELECT COUNT(DISTINCT a.id) as count FROM articles a LEFT JOIN article_tags at ON a.id = at.article_id'
      : 'SELECT COUNT(*) as count FROM articles a';
    
    const conditions: string[] = ["a.status = 'published'"];
    const bindings: (string | number)[] = [];

    // 标签筛选需要 JOIN
    if (params.tagId) {
      query = `
        SELECT DISTINCT a.id, a.title, a.content, a.cover, a.category_id,
               a.description, a.keywords, a.status, a.view_count, a.like_count, a.created_at, a.updated_at
        FROM articles a
        LEFT JOIN article_tags at ON a.id = at.article_id
      `;
      conditions.push('at.tag_id = ?');
      bindings.push(params.tagId);
    }

    // 分类筛选
    if (params.categoryId) {
      conditions.push('a.category_id = ?');
      bindings.push(params.categoryId);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    query += whereClause + ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    
    const offset = (params.page! - 1) * params.pageSize!;
    bindings.push(params.pageSize!, offset);

    // 获取文章列表
    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...bindings).all<Article>();

    // 获取总数
    const countStmt = env.DB.prepare(countQuery + whereClause);
    const countBindings = bindings.slice(0, -2); // 移除 LIMIT 和 OFFSET
    const countResult = await (countBindings.length > 0 
      ? countStmt.bind(...countBindings) 
      : countStmt
    ).first<{ count: number }>();

    // 获取每篇文章的分类和标签
    const articles = await Promise.all(
      (result.results || []).map(async (article) => {
        const [category, tags] = await Promise.all([
          article.category_id
            ? env.DB.prepare('SELECT id, name, slug, description, created_at FROM categories WHERE id = ?')
                .bind(article.category_id)
                .first<Category>()
            : null,
          env.DB.prepare(`
            SELECT t.id, t.name, t.slug, t.created_at
            FROM tags t
            JOIN article_tags at ON t.id = at.tag_id
            WHERE at.article_id = ?
          `).bind(article.id).all<Tag>(),
        ]);

        return {
          ...article,
          category: category || undefined,
          tags: tags.results || [],
        };
      })
    );

    const response: PaginatedResponse<Article> = {
      data: articles,
      total: countResult?.count || 0,
      page: params.page!,
      pageSize: params.pageSize!,
    };

    return success(response);
  } catch (error) {
    console.error('Get articles error:', error);
    return internalError('Failed to fetch articles');
  }
}

/**
 * 获取文章列表（管理 API，包含草稿）
 * 
 * GET /api/admin/articles
 */
export async function handleGetAdminArticles(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const params: ArticleListParams = {
    page: parseInt(url.searchParams.get('page') || '1'),
    pageSize: parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE)),
    categoryId: url.searchParams.get('categoryId') ? parseInt(url.searchParams.get('categoryId')!) : undefined,
    status: url.searchParams.get('status') as ArticleListParams['status'] || undefined,
  };

  if (params.page! < 1) params.page = 1;
  if (params.pageSize! < 1 || params.pageSize! > 100) params.pageSize = DEFAULT_PAGE_SIZE;

  try {
    let query = `
      SELECT id, title, content, cover, category_id, description, keywords, status, view_count, like_count, created_at, updated_at
      FROM articles
    `;
    let countQuery = 'SELECT COUNT(*) as count FROM articles';
    
    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (params.categoryId) {
      conditions.push('category_id = ?');
      bindings.push(params.categoryId);
    }

    if (params.status) {
      conditions.push('status = ?');
      bindings.push(params.status);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    query += whereClause + ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    countQuery += whereClause;

    const offset = (params.page! - 1) * params.pageSize!;
    bindings.push(params.pageSize!, offset);

    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...bindings).all<Article>();

    const countBindings = bindings.slice(0, -2);
    const countStmt = env.DB.prepare(countQuery);
    const countResult = await (countBindings.length > 0
      ? countStmt.bind(...countBindings)
      : countStmt
    ).first<{ count: number }>();

    const response: PaginatedResponse<Article> = {
      data: result.results || [],
      total: countResult?.count || 0,
      page: params.page!,
      pageSize: params.pageSize!,
    };

    return success(response);
  } catch (error) {
    console.error('Get admin articles error:', error);
    return internalError('Failed to fetch articles');
  }
}

/**
 * 获取单篇文章（公开 API）
 * 
 * GET /api/article/:id
 * 
 * 验证: 需求 7.4 - 未发布文章返回 404
 */
export async function handleGetArticle(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    // 增加浏览量并获取文章
    await env.DB.prepare(`
      UPDATE articles SET view_count = view_count + 1 WHERE id = ? AND status = 'published'
    `).bind(id).run();

    const article = await env.DB.prepare(`
      SELECT id, title, content, cover, category_id, description, keywords, status, view_count, like_count, created_at, updated_at
      FROM articles WHERE id = ? AND status = 'published'
    `).bind(id).first<Article>();

    if (!article) {
      return notFound('Article not found');
    }

    // 获取分类、标签和相关文章
    const [category, tags, relatedArticles] = await Promise.all([
      article.category_id
        ? env.DB.prepare('SELECT id, name, slug, description, created_at FROM categories WHERE id = ?')
            .bind(article.category_id)
            .first<Category>()
        : null,
      env.DB.prepare(`
        SELECT t.id, t.name, t.slug, t.created_at
        FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        WHERE at.article_id = ?
      `).bind(id).all<Tag>(),
      // 获取相关文章（同分类或同标签，排除当前文章）
      env.DB.prepare(`
        SELECT DISTINCT a.id, a.title, a.cover, a.description, a.view_count, a.created_at
        FROM articles a
        LEFT JOIN article_tags at ON a.id = at.article_id
        WHERE a.id != ? 
          AND a.status = 'published'
          AND (a.category_id = ? OR at.tag_id IN (
            SELECT tag_id FROM article_tags WHERE article_id = ?
          ))
        ORDER BY a.view_count DESC, a.created_at DESC
        LIMIT 4
      `).bind(id, article.category_id || 0, id).all<Article>(),
    ]);

    return success({
      ...article,
      category: category || undefined,
      tags: tags.results || [],
      relatedArticles: relatedArticles.results || [],
    });
  } catch (error) {
    console.error('Get article error:', error);
    return internalError('Failed to fetch article');
  }
}

/**
 * 获取单篇文章（管理 API，包含草稿）
 * 
 * GET /api/admin/article/:id
 */
export async function handleGetAdminArticle(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    const article = await env.DB.prepare(`
      SELECT id, title, content, cover, category_id, description, keywords, status, view_count, like_count, created_at, updated_at
      FROM articles WHERE id = ?
    `).bind(id).first<Article>();

    if (!article) {
      return notFound('Article not found');
    }

    const tags = await env.DB.prepare(`
      SELECT t.id, t.name, t.slug, t.created_at
      FROM tags t
      JOIN article_tags at ON t.id = at.tag_id
      WHERE at.article_id = ?
    `).bind(id).all<Tag>();

    return success({
      ...article,
      tags: tags.results || [],
    });
  } catch (error) {
    console.error('Get admin article error:', error);
    return internalError('Failed to fetch article');
  }
}


/**
 * 创建文章
 * 
 * POST /api/admin/article
 * 
 * 验证: 需求 2.2 - 文章数据持久化到数据库
 * 验证: 需求 2.6 - 支持草稿和已发布状态
 * 验证: 需求 5.2 - 创建文章标签关联
 */
export async function handleCreateArticle(
  request: Request,
  env: Env
): Promise<Response> {
  let body: ArticleFormData;
  try {
    body = await request.json() as ArticleFormData;
  } catch {
    return badRequest('Invalid JSON body');
  }

  // 验证必填字段
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return badRequest('Title is required');
  }
  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    return badRequest('Content is required');
  }
  if (!body.status || !['draft', 'published'].includes(body.status)) {
    return badRequest('Status must be draft or published');
  }

  const { title, content, cover, category_id, description, keywords, status, tag_ids } = body;

  try {
    // 插入文章
    const article = await env.DB.prepare(`
      INSERT INTO articles (title, content, cover, category_id, description, keywords, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id, title, content, cover, category_id, description, keywords, status, created_at, updated_at
    `)
      .bind(
        title.trim(),
        content.trim(),
        cover || null,
        category_id || null,
        description?.trim() || null,
        keywords?.trim() || null,
        status
      )
      .first<Article>();

    if (!article) {
      return internalError('Failed to create article');
    }

    // 创建标签关联
    if (tag_ids && tag_ids.length > 0) {
      const insertPromises = tag_ids.map((tagId) =>
        env.DB.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)')
          .bind(article.id, tagId)
          .run()
      );
      await Promise.all(insertPromises);
    }

    // 获取关联的标签
    const tags = await env.DB.prepare(`
      SELECT t.id, t.name, t.slug, t.created_at
      FROM tags t
      JOIN article_tags at ON t.id = at.tag_id
      WHERE at.article_id = ?
    `).bind(article.id).all<Tag>();

    return success({ ...article, tags: tags.results || [] }, 201);
  } catch (error) {
    console.error('Create article error:', error);
    return internalError('Failed to create article');
  }
}

/**
 * 更新文章
 * 
 * PUT /api/admin/article/:id
 */
export async function handleUpdateArticle(
  request: Request,
  env: Env,
  id: number
): Promise<Response> {
  let body: ArticleFormData;
  try {
    body = await request.json() as ArticleFormData;
  } catch {
    return badRequest('Invalid JSON body');
  }

  // 验证必填字段
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return badRequest('Title is required');
  }
  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    return badRequest('Content is required');
  }
  if (!body.status || !['draft', 'published'].includes(body.status)) {
    return badRequest('Status must be draft or published');
  }

  const { title, content, cover, category_id, description, keywords, status, tag_ids } = body;

  try {
    // 检查文章是否存在
    const existing = await env.DB.prepare('SELECT id FROM articles WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return notFound('Article not found');
    }

    // 更新文章
    const article = await env.DB.prepare(`
      UPDATE articles 
      SET title = ?, content = ?, cover = ?, category_id = ?, description = ?, keywords = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, title, content, cover, category_id, description, keywords, status, created_at, updated_at
    `)
      .bind(
        title.trim(),
        content.trim(),
        cover || null,
        category_id || null,
        description?.trim() || null,
        keywords?.trim() || null,
        status,
        id
      )
      .first<Article>();

    // 更新标签关联：先删除旧的，再添加新的
    await env.DB.prepare('DELETE FROM article_tags WHERE article_id = ?')
      .bind(id)
      .run();

    if (tag_ids && tag_ids.length > 0) {
      const insertPromises = tag_ids.map((tagId) =>
        env.DB.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)')
          .bind(id, tagId)
          .run()
      );
      await Promise.all(insertPromises);
    }

    // 获取关联的标签
    const tags = await env.DB.prepare(`
      SELECT t.id, t.name, t.slug, t.created_at
      FROM tags t
      JOIN article_tags at ON t.id = at.tag_id
      WHERE at.article_id = ?
    `).bind(id).all<Tag>();

    return success({ ...article, tags: tags.results || [] });
  } catch (error) {
    console.error('Update article error:', error);
    return internalError('Failed to update article');
  }
}

/**
 * 删除文章
 * 
 * DELETE /api/admin/article/:id
 * 
 * 验证: 需求 2.4 - 从数据库中移除文章记录
 */
export async function handleDeleteArticle(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    // 检查文章是否存在
    const existing = await env.DB.prepare('SELECT id FROM articles WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return notFound('Article not found');
    }

    // 删除文章（article_tags 会通过 CASCADE 自动删除）
    await env.DB.prepare('DELETE FROM articles WHERE id = ?')
      .bind(id)
      .run();

    return success({ deleted: true });
  } catch (error) {
    console.error('Delete article error:', error);
    return internalError('Failed to delete article');
  }
}

/**
 * 点赞/取消点赞文章
 * 
 * POST /api/article/:id/like
 * Body: { action: 'like' | 'unlike' }
 */
export async function handleLikeArticle(
  request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    // 解析请求体
    let action = 'like';
    try {
      const body = await request.json() as { action?: string };
      if (body.action === 'unlike') {
        action = 'unlike';
      }
    } catch {
      // 默认为点赞
    }

    // 检查文章是否存在且已发布
    const article = await env.DB.prepare(
      "SELECT id, like_count FROM articles WHERE id = ? AND status = 'published'"
    ).bind(id).first<{ id: number; like_count: number }>();

    if (!article) {
      return notFound('Article not found');
    }

    const currentLikes = article.like_count || 0;
    let newLikeCount: number;

    if (action === 'unlike') {
      // 取消点赞，确保不会小于0
      newLikeCount = Math.max(0, currentLikes - 1);
      await env.DB.prepare(
        'UPDATE articles SET like_count = ? WHERE id = ?'
      ).bind(newLikeCount, id).run();
    } else {
      // 点赞
      newLikeCount = currentLikes + 1;
      await env.DB.prepare(
        'UPDATE articles SET like_count = like_count + 1 WHERE id = ?'
      ).bind(id).run();
    }

    return success({ 
      liked: action === 'like', 
      like_count: newLikeCount 
    });
  } catch (error) {
    console.error('Like article error:', error);
    return internalError('Failed to like article');
  }
}


/**
 * 置顶/取消置顶文章
 * 
 * POST /api/admin/article/:id/pin
 */
export async function handlePinArticle(
  _request: Request,
  env: Env,
  id: number
): Promise<Response> {
  try {
    const article = await env.DB.prepare(
      'SELECT id, is_pinned FROM articles WHERE id = ?'
    ).bind(id).first<{ id: number; is_pinned: number }>();

    if (!article) {
      return notFound('Article not found');
    }

    const newPinned = article.is_pinned ? 0 : 1;
    await env.DB.prepare(
      'UPDATE articles SET is_pinned = ? WHERE id = ?'
    ).bind(newPinned, id).run();

    return success({ 
      pinned: newPinned === 1,
      message: newPinned ? 'Article pinned' : 'Article unpinned'
    });
  } catch (error) {
    console.error('Pin article error:', error);
    return internalError('Failed to pin article');
  }
}
