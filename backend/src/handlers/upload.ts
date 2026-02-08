/**
 * 文件上传处理器
 * 
 * 实现图片上传 API
 * 
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 * - POST /api/upload: 上传图片到 R2
 * - 验证文件类型（仅图片）
 * - 验证文件大小（10MB 限制）
 * - 生成唯一文件名
 */

import { success, badRequest, internalError } from '../utils/response';
import { generateSecureToken } from '../middleware/security';
import type { Env } from '../types/env';
import type { UploadResponse } from '../models/types';

// 允许的图片 MIME 类型
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// 文件大小限制：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// MIME 类型到文件扩展名的映射
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

/**
 * 生成唯一文件名
 * 
 * 使用时间戳 + 加密安全随机字符串确保唯一性和不可预测性
 * 
 * 验证: 需求 3.5 - 生成唯一文件名避免冲突
 */
export function generateUniqueFilename(mimeType: string): string {
  const timestamp = Date.now();
  const random = generateSecureToken(16); // 32 字符的安全随机字符串
  const ext = MIME_TO_EXT[mimeType] || '.bin';
  return `${timestamp}-${random}${ext}`;
}

/**
 * 验证文件类型
 * 
 * 验证: 需求 3.3 - 仅允许图片格式
 */
export function isValidImageType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * 验证文件大小
 * 
 * 验证: 需求 3.4 - 10MB 大小限制
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * 处理文件上传
 * 
 * POST /api/upload
 * 
 * 验证: 需求 3.1 - 上传到 R2 存储
 * 验证: 需求 3.2 - 返回公开访问 URL
 */
export async function handleUpload(
  request: Request,
  env: Env
): Promise<Response> {
  // 验证请求方法
  if (request.method !== 'POST') {
    return badRequest('Method not allowed');
  }

  // 获取 Content-Type
  const contentType = request.headers.get('Content-Type') || '';

  // 处理 multipart/form-data
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return badRequest('No file provided');
      }

      // 验证文件类型
      if (!isValidImageType(file.type)) {
        return badRequest(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
      }

      // 验证文件大小
      if (!isValidFileSize(file.size)) {
        return badRequest(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // 生成唯一文件名
      const filename = generateUniqueFilename(file.type);

      // 上传到 R2
      const arrayBuffer = await file.arrayBuffer();
      await env.BUCKET.put(filename, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
      });

      // 构建公开访问 URL
      // 注意：实际 URL 格式取决于 R2 存储桶的配置
      const url = `/uploads/${filename}`;

      const response: UploadResponse = {
        url,
        filename,
      };

      return success(response, 201);
    } catch (error) {
      console.error('Upload error:', error);
      return internalError('Failed to upload file');
    }
  }

  // 处理直接二进制上传
  const mimeType = contentType.split(';')[0].trim();
  
  if (!isValidImageType(mimeType)) {
    return badRequest(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  try {
    const arrayBuffer = await request.arrayBuffer();

    // 验证文件大小
    if (!isValidFileSize(arrayBuffer.byteLength)) {
      return badRequest(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // 生成唯一文件名
    const filename = generateUniqueFilename(mimeType);

    // 上传到 R2
    await env.BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    const url = `/uploads/${filename}`;

    const response: UploadResponse = {
      url,
      filename,
    };

    return success(response, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return internalError('Failed to upload file');
  }
}

/**
 * 获取允许的 MIME 类型列表
 */
export function getAllowedMimeTypes(): string[] {
  return [...ALLOWED_MIME_TYPES];
}

/**
 * 获取最大文件大小（字节）
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}
