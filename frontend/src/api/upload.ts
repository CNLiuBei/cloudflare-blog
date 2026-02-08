/**
 * 上传 API
 */

import api from './client';
import type { UploadResponse } from './types';

export const uploadApi = {
  /**
   * 上传图片
   */
  async uploadImage(file: File): Promise<UploadResponse> {
    return api.upload<UploadResponse>('/upload', file);
  },
};

export default uploadApi;
