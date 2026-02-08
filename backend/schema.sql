-- Cloudflare D1 数据库 Schema
-- 博客系统数据库表定义

-- 管理员表
-- 需求 10.6: admins 表包含字段：id、username、password_hash、created_at
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
-- 需求 10.3: categories 表包含字段：id、name、slug、description、created_at
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 标签表
-- 需求 10.4: tags 表包含字段：id、name、slug、created_at
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
-- 需求 10.2: articles 表包含字段：id、title、content、cover、category_id、description、keywords、status、created_at、updated_at
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cover TEXT,
  category_id INTEGER,
  description TEXT,
  keywords TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 文章标签关联表
-- 需求 10.5: article_tags 表包含字段：article_id、tag_id（复合主键）
CREATE TABLE article_tags (
  article_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 索引优化查询性能
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_created ON articles(created_at DESC);

-- 初始化默认管理员账户
-- 密码: admin123 (使用 bcrypt 哈希，cost factor = 10)
-- 注意: 生产环境部署前请务必修改此密码
INSERT INTO admins (username, password_hash) VALUES (
  'admin',
  '$2b$10$j2tQ0TaTKUhYL.R/Ei/2VOz3ZDHpz.xwPYKj2gHszNfOqPq1nZ2.S'
);
