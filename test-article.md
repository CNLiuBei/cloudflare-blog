# Cloudflare 全栈博客系统介绍

这是一个基于 **Cloudflare Workers** 构建的现代化全栈博客系统，采用 **Swiss Modernism 2.0** 设计风格。

## 技术栈概览

本系统采用以下技术栈：

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + TypeScript | 现代化前端框架 |
| 样式 | 自定义 CSS | Swiss Modernism 2.0 设计系统 |
| 后端 | Cloudflare Workers | 边缘计算，全球部署 |
| 数据库 | Cloudflare D1 | SQLite 兼容的边缘数据库 |
| 存储 | Cloudflare R2 | S3 兼容的对象存储 |
| 认证 | JWT | JSON Web Token 认证 |

## 主要功能

### 1. 文章管理

系统支持完整的文章 CRUD 操作：

- **创建文章** - 支持 Markdown 编辑，实时预览
- **编辑文章** - 自动保存草稿，防止内容丢失
- **删除文章** - 支持单个删除和批量删除
- **发布/草稿** - 灵活的发布状态管理

### 2. 分类与标签

文章可以通过分类和标签进行组织：

1. 每篇文章可以属于一个分类
2. 每篇文章可以有多个标签
3. 支持按分类/标签筛选文章

### 3. 用户体验优化

> 我们注重每一个细节，让阅读体验更加舒适。

系统包含以下 UX 优化：

- [x] 阅读进度指示
- [x] 预计阅读时间
- [x] 目录导航（TOC）
- [x] 代码高亮
- [x] 暗色模式
- [x] 键盘快捷键
- [ ] 评论系统（计划中）

## 代码示例

### 后端 API 示例

```typescript
// 获取文章列表 API
export async function getArticles(env: Env, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  
  const articles = await env.DB.prepare(`
    SELECT a.*, c.name as category_name
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();
  
  return {
    data: articles.results,
    total: articles.meta.total_count,
    page,
    pageSize
  };
}
```

### 前端组件示例

```tsx
// 文章卡片组件
function ArticleCard({ article }: { article: Article }) {
  const navigate = useNavigate();
  
  return (
    <article 
      className="article-card"
      onClick={() => navigate(`/article/${article.id}`)}
    >
      {article.cover && (
        <img src={article.cover} alt={article.title} />
      )}
      <h2>{article.title}</h2>
      <p>{article.description}</p>
    </article>
  );
}
```

### CSS 样式示例

```css
/* Swiss Modernism 2.0 设计系统 */
:root {
  --color-primary: #0891B2;
  --color-secondary: #22D3EE;
  --color-cta: #22C55E;
  --font-family: 'Inter', sans-serif;
}

.article-card {
  background: var(--color-white);
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.article-card:hover {
  transform: translateY(-2px);
}
```

## 系统架构

系统采用前后端分离架构：

```
┌─────────────────────────────────────────────────────┐
│                    用户浏览器                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Cloudflare CDN (全球边缘)               │
├─────────────────────┬───────────────────────────────┤
│     前端静态资源     │        Workers API            │
│   (React + Vite)    │    (Hono Framework)           │
└─────────────────────┴───────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Cloudflare D1  │     │  Cloudflare R2   │
│   (SQLite 数据库) │     │   (文件存储)     │
└─────────────────┘     └─────────────────┘
```

## 快捷键支持

在文章页面，你可以使用以下快捷键：

| 快捷键 | 功能 |
|--------|------|
| `Esc` | 返回首页 |
| `L` | 点赞文章 |
| `T` | 切换目录 |
| `?` | 显示帮助 |

## 相关链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [React 官方文档](https://react.dev/)
- [Hono 框架](https://hono.dev/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)

## 图片展示

这是一张示例图片（使用占位图）：

![博客系统截图](https://picsum.photos/800/400)

## 引用与强调

正如 *Steve Jobs* 所说：

> Design is not just what it looks like and feels like. Design is how it works.
> 
> — Steve Jobs

这正是我们设计这个博客系统的理念：**简洁**、*优雅*、~~复杂~~ 实用。

## 数学公式（如果支持）

行内公式：质能方程 E = mc²

## 分割线

---

## 总结

这个博客系统具有以下特点：

1. **高性能** - 基于 Cloudflare 边缘网络，全球访问速度快
2. **低成本** - 使用 Cloudflare 免费套餐即可运行
3. **易维护** - 代码结构清晰，TypeScript 类型安全
4. **美观** - Swiss Modernism 2.0 设计风格

感谢阅读！如果觉得有帮助，请点击下方的 ❤️ 按钮支持一下~

---

*最后更新：2026年2月*
