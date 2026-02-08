/**
 * Cloudflare Workers 环境类型定义
 * 
 * 定义 D1 数据库、R2 存储桶和环境变量的绑定类型
 */

export interface Env {
  // D1 数据库绑定 (需求 12.2)
  DB: D1Database;
  
  // R2 存储桶绑定 (需求 12.3)
  BUCKET: R2Bucket;
  
  // 环境变量
  ENVIRONMENT: string;
  
  // JWT 密钥 (通过 wrangler secret 设置)
  JWT_SECRET: string;
}
