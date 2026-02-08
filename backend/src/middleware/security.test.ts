/**
 * 安全中间件测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  addSecurityHeaders,
  checkRequestBodySize,
  validateStringLength,
  sanitizeString,
  isSafeUrl,
  generateSecureToken,
  checkRateLimit,
  getClientIP,
  clearRateLimitStore,
  SECURITY_HEADERS,
  MAX_REQUEST_BODY_SIZE,
  INPUT_LIMITS,
} from './security';

describe('Security Middleware', () => {
  describe('addSecurityHeaders', () => {
    it('should add all security headers to response', () => {
      const response = new Response('test', { status: 200 });
      const securedResponse = addSecurityHeaders(response);

      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(securedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(securedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(securedResponse.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(securedResponse.headers.get('Permissions-Policy')).toBeTruthy();
    });

    it('should preserve original response status', () => {
      const response = new Response('not found', { status: 404 });
      const securedResponse = addSecurityHeaders(response);
      expect(securedResponse.status).toBe(404);
    });
  });

  describe('checkRequestBodySize', () => {
    it('should allow requests within size limit', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      });
      const result = await checkRequestBodySize(request);
      expect(result.valid).toBe(true);
      expect(result.size).toBe(1000);
    });

    it('should reject requests exceeding size limit', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        headers: { 'Content-Length': String(MAX_REQUEST_BODY_SIZE + 1) },
      });
      const result = await checkRequestBodySize(request);
      expect(result.valid).toBe(false);
    });

    it('should handle requests without Content-Length', async () => {
      const request = new Request('http://test.com', { method: 'POST' });
      const result = await checkRequestBodySize(request);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStringLength', () => {
    it('should validate username within limits', () => {
      const result = validateStringLength('admin', 'username');
      expect(result.valid).toBe(true);
    });

    it('should reject empty username', () => {
      const result = validateStringLength('', 'username');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least');
    });

    it('should reject username exceeding max length', () => {
      const longUsername = 'a'.repeat(INPUT_LIMITS.username.max + 1);
      const result = validateStringLength(longUsername, 'username');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('exceed');
    });

    it('should validate password within limits', () => {
      const result = validateStringLength('password123', 'password');
      expect(result.valid).toBe(true);
    });

    it('should reject short password', () => {
      const result = validateStringLength('12345', 'password');
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
    });

    it('should escape quotes', () => {
      const input = 'test "quoted" and \'single\'';
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain("'");
    });
  });

  describe('isSafeUrl', () => {
    it('should allow https URLs', () => {
      expect(isSafeUrl('https://example.com/path')).toBe(true);
    });

    it('should allow http URLs', () => {
      expect(isSafeUrl('http://example.com/path')).toBe(true);
    });

    it('should reject localhost', () => {
      expect(isSafeUrl('http://localhost:3000')).toBe(false);
    });

    it('should reject 127.0.0.1', () => {
      expect(isSafeUrl('http://127.0.0.1:8080')).toBe(false);
    });

    it('should reject private IP ranges', () => {
      expect(isSafeUrl('http://192.168.1.1')).toBe(false);
      expect(isSafeUrl('http://10.0.0.1')).toBe(false);
      expect(isSafeUrl('http://172.16.0.1')).toBe(false);
    });

    it('should reject .local domains', () => {
      expect(isSafeUrl('http://myserver.local')).toBe(false);
    });

    it('should reject non-http protocols', () => {
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate hex string', () => {
      const token = generateSecureToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      clearRateLimitStore();
    });

    it('should allow requests within limit', () => {
      const result = checkRateLimit('test-key', { maxRequests: 5, windowMs: 60000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track request count', () => {
      const config = { maxRequests: 3, windowMs: 60000 };
      
      checkRateLimit('test-key', config);
      checkRateLimit('test-key', config);
      const result = checkRateLimit('test-key', config);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should block requests exceeding limit', () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      
      checkRateLimit('test-key', config);
      checkRateLimit('test-key', config);
      const result = checkRateLimit('test-key', config);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different keys separately', () => {
      const config = { maxRequests: 1, windowMs: 60000 };
      
      checkRateLimit('key1', config);
      const result = checkRateLimit('key2', config);
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('getClientIP', () => {
    it('should extract CF-Connecting-IP header', () => {
      const request = new Request('http://test.com', {
        headers: { 'CF-Connecting-IP': '1.2.3.4' },
      });
      expect(getClientIP(request)).toBe('1.2.3.4');
    });

    it('should fallback to X-Forwarded-For', () => {
      const request = new Request('http://test.com', {
        headers: { 'X-Forwarded-For': '5.6.7.8, 9.10.11.12' },
      });
      expect(getClientIP(request)).toBe('5.6.7.8');
    });

    it('should return unknown when no IP headers', () => {
      const request = new Request('http://test.com');
      expect(getClientIP(request)).toBe('unknown');
    });
  });
});
