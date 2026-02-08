/**
 * JWT 认证模块单元测试
 * 
 * 验证 JWT 签发和验证功能的正确性
 * 
 * 需求: 1.1, 1.5
 */

import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, getTokenExpirationSeconds } from './jwt';

describe('JWT 认证模块', () => {
  const testSecret = 'test-secret-key-for-jwt-testing';
  
  describe('signToken', () => {
    it('应该成功签发 JWT 令牌', async () => {
      const payload = { sub: '1', username: 'admin' };
      
      const token = await signToken(payload, testSecret);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT 格式: header.payload.signature
    });

    it('应该为不同用户生成不同的令牌', async () => {
      const payload1 = { sub: '1', username: 'admin' };
      const payload2 = { sub: '2', username: 'user' };
      
      const token1 = await signToken(payload1, testSecret);
      const token2 = await signToken(payload2, testSecret);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('应该成功验证有效的 JWT 令牌', async () => {
      const payload = { sub: '1', username: 'admin' };
      const token = await signToken(payload, testSecret);
      
      const decoded = await verifyToken(token, testSecret);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('1');
      expect(decoded?.username).toBe('admin');
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
    });

    it('应该返回 null 当令牌签名无效时', async () => {
      const payload = { sub: '1', username: 'admin' };
      const token = await signToken(payload, testSecret);
      
      const decoded = await verifyToken(token, 'wrong-secret');
      
      expect(decoded).toBeNull();
    });

    it('应该返回 null 当令牌格式无效时', async () => {
      const decoded = await verifyToken('invalid-token', testSecret);
      
      expect(decoded).toBeNull();
    });

    it('应该返回 null 当令牌为空字符串时', async () => {
      const decoded = await verifyToken('', testSecret);
      
      expect(decoded).toBeNull();
    });
  });

  describe('JWT 令牌往返一致性', () => {
    it('签发的令牌应该能被正确解码，包含正确的用户信息', async () => {
      const originalPayload = { sub: '123', username: 'testuser' };
      
      const token = await signToken(originalPayload, testSecret);
      const decoded = await verifyToken(token, testSecret);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(originalPayload.sub);
      expect(decoded?.username).toBe(originalPayload.username);
    });
  });

  describe('getTokenExpirationSeconds', () => {
    it('应该返回 24 小时的秒数', () => {
      const seconds = getTokenExpirationSeconds();
      
      expect(seconds).toBe(24 * 60 * 60); // 86400 秒
    });
  });

  describe('令牌有效期', () => {
    it('签发的令牌应该有 24 小时有效期', async () => {
      const payload = { sub: '1', username: 'admin' };
      
      const token = await signToken(payload, testSecret);
      const decoded = await verifyToken(token, testSecret);
      
      expect(decoded).not.toBeNull();
      expect(decoded!.exp - decoded!.iat).toBe(24 * 60 * 60);
    });
  });
});
