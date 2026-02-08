# 需求文档

## 简介

本文档定义了一个生产级 Cloudflare 全栈博客系统的需求。该系统采用完全 Serverless 架构，使用 Cloudflare 生态系统（Pages、Workers、D1、R2）构建，包含前台博客展示和后台管理两大模块。

## 术语表

- **Blog_System**: 整个博客系统，包含前端和后端
- **Frontend**: 基于 React + Vite 的前端应用，部署到 Cloudflare Pages
- **Backend**: 基于 Cloudflare Workers 的后端 API 服务
- **D1_Database**: Cloudflare D1 数据库服务
- **R2_Storage**: Cloudflare R2 对象存储服务
- **JWT_Auth**: 基于 JSON Web Token 的身份验证机制
- **Admin_Panel**: 后台管理系统
- **Article**: 博客文章实体
- **Category**: 文章分类实体
- **Tag**: 文章标签实体
- **Markdown_Editor**: Markdown 格式的文章编辑器
- **SEO_Metadata**: 搜索引擎优化相关的元数据

## 需求

### 需求 1：管理员身份验证

**用户故事：** 作为管理员，我希望能够安全登录后台系统，以便管理博客内容。

#### 验收标准

1. WHEN 管理员提交有效的用户名和密码 THEN Backend SHALL 返回有效的 JWT 令牌
2. WHEN 管理员提交无效的凭据 THEN Backend SHALL 返回 401 错误并拒绝访问
3. WHEN 请求受保护的 API 端点时携带有效 JWT THEN Backend SHALL 允许访问并处理请求
4. WHEN 请求受保护的 API 端点时 JWT 无效或过期 THEN Backend SHALL 返回 401 错误
5. THE JWT_Auth SHALL 使用安全的密钥签名，令牌有效期为 24 小时

### 需求 2：文章管理

**用户故事：** 作为管理员，我希望能够创建、编辑和删除文章，以便维护博客内容。

#### 验收标准

1. WHEN 管理员创建新文章时 THEN Admin_Panel SHALL 提供 Markdown_Editor 用于编写内容
2. WHEN 管理员保存文章时 THEN Backend SHALL 将文章数据持久化到 D1_Database
3. WHEN 管理员编辑现有文章时 THEN Admin_Panel SHALL 加载文章内容到 Markdown_Editor
4. WHEN 管理员删除文章时 THEN Backend SHALL 从 D1_Database 中移除该文章记录
5. THE Article SHALL 包含以下字段：标题、内容、封面图片、描述、关键词、状态、创建时间、更新时间
6. WHEN 管理员设置文章状态时 THEN Backend SHALL 支持草稿和已发布两种状态

### 需求 3：图片上传

**用户故事：** 作为管理员，我希望能够上传文章封面图片，以便丰富文章展示效果。

#### 验收标准

1. WHEN 管理员上传图片文件时 THEN Backend SHALL 将文件存储到 R2_Storage
2. WHEN 图片上传成功时 THEN Backend SHALL 返回图片的公开访问 URL
3. IF 上传的文件不是有效的图片格式 THEN Backend SHALL 返回 400 错误并拒绝上传
4. IF 上传的文件超过大小限制（10MB）THEN Backend SHALL 返回 400 错误
5. THE R2_Storage SHALL 为上传的图片生成唯一的文件名以避免冲突

### 需求 4：分类管理

**用户故事：** 作为管理员，我希望能够管理文章分类，以便组织博客内容结构。

#### 验收标准

1. WHEN 管理员创建分类时 THEN Backend SHALL 将分类保存到 D1_Database
2. WHEN 管理员编辑分类时 THEN Backend SHALL 更新 D1_Database 中的分类记录
3. WHEN 管理员删除分类时 THEN Backend SHALL 检查是否有关联文章
4. IF 分类下存在关联文章 THEN Backend SHALL 阻止删除并返回错误提示
5. THE Category SHALL 包含以下字段：名称、别名（slug）、描述

### 需求 5：标签管理

**用户故事：** 作为管理员，我希望能够管理文章标签，以便为文章添加多维度分类。

#### 验收标准

1. WHEN 管理员创建标签时 THEN Backend SHALL 将标签保存到 D1_Database
2. WHEN 管理员为文章添加标签时 THEN Backend SHALL 在 article_tags 表中创建关联记录
3. WHEN 管理员删除标签时 THEN Backend SHALL 同时删除相关的 article_tags 关联记录
4. THE Tag SHALL 包含以下字段：名称、别名（slug）
5. THE Article SHALL 支持关联多个 Tag（多对多关系）

### 需求 6：前台文章列表

**用户故事：** 作为访客，我希望能够浏览博客文章列表，以便发现感兴趣的内容。

#### 验收标准

1. WHEN 访客访问首页时 THEN Frontend SHALL 显示已发布文章的分页列表
2. WHEN 文章列表加载时 THEN Frontend SHALL 显示文章标题、封面、摘要、发布时间
3. WHEN 访客点击分页控件时 THEN Frontend SHALL 加载对应页码的文章
4. THE Backend SHALL 每页返回 10 篇文章，并提供总数和分页信息
5. THE Frontend SHALL 仅显示状态为已发布的文章

### 需求 7：文章详情展示

**用户故事：** 作为访客，我希望能够阅读文章详情，以便获取完整的文章内容。

#### 验收标准

1. WHEN 访客访问文章详情页时 THEN Frontend SHALL 从 Backend 获取文章完整内容
2. WHEN 文章内容加载完成时 THEN Frontend SHALL 将 Markdown 内容渲染为 HTML
3. WHEN 文章详情页加载时 THEN Frontend SHALL 显示文章标题、封面、内容、分类、标签、发布时间
4. IF 请求的文章不存在或未发布 THEN Frontend SHALL 显示 404 页面

### 需求 8：分类和标签筛选

**用户故事：** 作为访客，我希望能够按分类或标签筛选文章，以便快速找到特定主题的内容。

#### 验收标准

1. WHEN 访客选择某个分类时 THEN Frontend SHALL 显示该分类下的所有已发布文章
2. WHEN 访客选择某个标签时 THEN Frontend SHALL 显示包含该标签的所有已发布文章
3. WHEN 筛选结果为空时 THEN Frontend SHALL 显示友好的空状态提示
4. THE Backend SHALL 支持按分类 ID 和标签 ID 筛选文章的 API 参数

### 需求 9：SEO 优化

**用户故事：** 作为博客所有者，我希望博客具有良好的 SEO 支持，以便提高搜索引擎排名。

#### 验收标准

1. WHEN 文章详情页加载时 THEN Frontend SHALL 设置正确的 meta 标签（title、description、keywords）
2. WHEN 管理员编辑文章时 THEN Admin_Panel SHALL 提供 SEO 字段的编辑功能
3. THE Frontend SHALL 为每个页面生成语义化的 HTML 结构
4. THE Frontend SHALL 支持 Open Graph 标签以优化社交媒体分享

### 需求 10：数据库设计

**用户故事：** 作为开发者，我希望有清晰的数据库设计，以便正确存储和查询数据。

#### 验收标准

1. THE D1_Database SHALL 包含以下表：articles、categories、tags、article_tags、admins
2. THE articles 表 SHALL 包含字段：id、title、content、cover、category_id、description、keywords、status、created_at、updated_at
3. THE categories 表 SHALL 包含字段：id、name、slug、description、created_at
4. THE tags 表 SHALL 包含字段：id、name、slug、created_at
5. THE article_tags 表 SHALL 包含字段：article_id、tag_id（复合主键）
6. THE admins 表 SHALL 包含字段：id、username、password_hash、created_at

### 需求 11：API 设计

**用户故事：** 作为开发者，我希望有规范的 RESTful API，以便前后端正确交互。

#### 验收标准

1. THE Backend SHALL 提供以下公开 API：GET /api/articles、GET /api/article/:id、GET /api/categories、GET /api/tags
2. THE Backend SHALL 提供以下认证 API：POST /api/login
3. THE Backend SHALL 提供以下管理 API（需 JWT）：POST /api/admin/article、PUT /api/admin/article/:id、DELETE /api/admin/article/:id、POST /api/upload
4. WHEN API 请求成功时 THEN Backend SHALL 返回统一的 JSON 响应格式
5. WHEN API 请求失败时 THEN Backend SHALL 返回包含错误码和错误信息的 JSON 响应
6. THE Backend SHALL 实现 JWT 中间件验证受保护的 API 端点

### 需求 12：部署配置

**用户故事：** 作为开发者，我希望项目可以直接部署到 Cloudflare，以便快速上线。

#### 验收标准

1. THE Backend SHALL 包含正确配置的 wrangler.toml 文件
2. THE wrangler.toml SHALL 包含 D1 数据库绑定配置
3. THE wrangler.toml SHALL 包含 R2 存储桶绑定配置
4. THE Frontend SHALL 可通过 Cloudflare Pages 部署
5. THE Blog_System SHALL 完全采用 Serverless 架构，不依赖传统服务器
