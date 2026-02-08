# Cloudflare 全栈博客系统

基于 Cloudflare 生态系统构建的全栈博客系统，采用完全 Serverless 架构。

## 技术栈

- **前端**: React 18 + Vite + React Router v6 + Ant Design
- **后端**: Cloudflare Workers (TypeScript)
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2
- **认证**: JWT (jose 库)

## 项目结构

```
/
├── frontend/          # React 前端项目
├── backend/           # Cloudflare Workers 后端
└── README.md
```

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Cloudflare 账户
- Wrangler CLI (`npm install -g wrangler`)

### 本地开发

1. **克隆项目并安装依赖**

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

2. **配置 Cloudflare**

```bash
# 登录 Cloudflare
wrangler login
```

3. **创建 D1 数据库**

```bash
cd backend

# 创建数据库
wrangler d1 create blog-db

# 记录返回的 database_id，更新 wrangler.toml 中的 database_id
```

4. **初始化数据库**

```bash
# 本地初始化
wrangler d1 execute blog-db --local --file=./schema.sql
```

5. **创建 R2 存储桶**

```bash
wrangler r2 bucket create blog-images
```

6. **设置 JWT 密钥**

```bash
# 生成一个安全的随机密钥
wrangler secret put JWT_SECRET
# 输入一个强密码，例如: your-super-secret-jwt-key-here
```

7. **启动开发服务器**

```bash
# 启动后端 (在 backend 目录)
npm run dev

# 启动前端 (在 frontend 目录，新终端)
npm run dev
```

### 部署到生产环境

1. **更新 wrangler.toml**

编辑 `backend/wrangler.toml`，将 `database_id` 替换为实际的数据库 ID。

2. **初始化生产数据库**

```bash
cd backend
wrangler d1 execute blog-db --remote --file=./schema.sql
```

3. **设置生产环境密钥**

```bash
wrangler secret put JWT_SECRET --env production
```

4. **部署后端**

```bash
cd backend
wrangler deploy --env production
```

5. **部署前端到 Cloudflare Pages**

```bash
cd frontend
npm run build

# 使用 Cloudflare Pages 部署
# 可以通过 Cloudflare Dashboard 连接 Git 仓库自动部署
# 或使用 wrangler pages deploy dist
```

## 默认管理员账户

- 用户名: `admin`
- 密码: `admin123`

**重要**: 生产环境部署前请修改默认密码！

## 安全特性

本系统实现了以下安全措施：

### 认证与授权
- JWT 令牌认证，1 小时过期
- 密码使用 bcrypt 哈希存储
- 管理 API 需要有效的 JWT 令牌

### 请求保护
- 登录接口速率限制（每 IP 每分钟 5 次）
- 请求体大小限制（JSON: 1MB, 上传: 10MB）
- 输入长度验证防止 DoS 攻击

### 安全响应头
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 文件上传安全
- 仅允许图片格式 (JPEG, PNG, GIF, WebP, SVG)
- 文件大小限制 10MB
- 加密安全的随机文件名

### 生产环境注意事项
1. **JWT_SECRET**: 必须使用 `wrangler secret put` 设置，不要硬编码
2. **修改默认密码**: 部署前修改 admin 账户密码
3. **HTTPS**: Cloudflare 默认启用 HTTPS
4. **R2 访问控制**: 根据需要配置 R2 存储桶的公开访问

## API 端点

### 公开 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/articles | 获取文章列表 |
| GET | /api/article/:id | 获取文章详情 |
| GET | /api/categories | 获取分类列表 |
| GET | /api/tags | 获取标签列表 |
| POST | /api/login | 管理员登录 |

### 管理 API (需要 JWT)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/admin/article | 创建文章 |
| PUT | /api/admin/article/:id | 更新文章 |
| DELETE | /api/admin/article/:id | 删除文章 |
| POST | /api/admin/category | 创建分类 |
| PUT | /api/admin/category/:id | 更新分类 |
| DELETE | /api/admin/category/:id | 删除分类 |
| POST | /api/admin/tag | 创建标签 |
| DELETE | /api/admin/tag/:id | 删除标签 |
| POST | /api/upload | 上传图片 |

## 环境变量

### 后端 (Cloudflare Workers)

- `JWT_SECRET`: JWT 签名密钥 (通过 `wrangler secret` 设置)
- `ENVIRONMENT`: 环境标识 (development/production)

### 前端 (Vite)

- `VITE_API_URL`: API 基础 URL (可选，默认使用 `/api`)

## 开发命令

### 后端

```bash
npm run dev          # 启动开发服务器
npm run deploy       # 部署到 Cloudflare
npm run test         # 运行测试
npm run typecheck    # TypeScript 类型检查
```

### 前端

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run test         # 运行测试
```

## License

MIT
