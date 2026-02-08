/**
 * CORS 中间件单元测试
 * 
 * 验证 CORS 中间件的正确性
 */

import { describe, it, expect } from 'vitest';
import {
  getCORSHeaders,
  handlePreflight,
  addCORSHeaders,
  corsMiddleware,
  defaultCORSConfig,
  type CORSConfig,
} from './cors';

describe('CORS 中间件', () => {
  describe('getCORSHeaders', () => {
    it('应该返回默认的 CORS 头', () => {
      const headers = getCORSHeaders(null);
      
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });

    it('应该使用自定义配置', () => {
      const config: CORSConfig = {
        allowOrigins: ['https://example.com'],
        allowMethods: ['GET', 'POST'],
        allowHeaders: ['Content-Type'],
        maxAge: 3600,
        allowCredentials: true,
      };
      
      const headers = getCORSHeaders('https://example.com', config);
      
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST');
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type');
      expect(headers['Access-Control-Max-Age']).toBe('3600');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Vary']).toBe('Origin');
    });

    it('应该不设置 Origin 当请求源不在允许列表中时', () => {
      const config: CORSConfig = {
        allowOrigins: ['https://example.com'],
        allowMethods: ['GET'],
        allowHeaders: ['Content-Type'],
      };
      
      const headers = getCORSHeaders('https://other.com', config);
      
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('应该不设置 Credentials 当 allowCredentials 为 false 时', () => {
      const headers = getCORSHeaders(null, defaultCORSConfig);
      
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });
  });

  describe('handlePreflight', () => {
    it('应该返回 204 状态码', () => {
      const request = new Request('https://example.com/api/test', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://client.com',
        },
      });
      
      const response = handlePreflight(request);
      
      expect(response.status).toBe(204);
    });

    it('应该包含 CORS 头', () => {
      const request = new Request('https://example.com/api/test', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://client.com',
        },
      });
      
      const response = handlePreflight(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });

    it('应该使用自定义配置', () => {
      const config: CORSConfig = {
        allowOrigins: ['https://client.com'],
        allowMethods: ['GET'],
        allowHeaders: ['X-Custom-Header'],
      };
      
      const request = new Request('https://example.com/api/test', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://client.com',
        },
      });
      
      const response = handlePreflight(request, config);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://client.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('X-Custom-Header');
    });
  });

  describe('addCORSHeaders', () => {
    it('应该为响应添加 CORS 头', () => {
      const originalResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const request = new Request('https://example.com/api/test', {
        headers: {
          'Origin': 'https://client.com',
        },
      });
      
      const response = addCORSHeaders(originalResponse, request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('应该保留原始响应的状态码', () => {
      const originalResponse = new Response('Created', { status: 201 });
      const request = new Request('https://example.com/api/test');
      
      const response = addCORSHeaders(originalResponse, request);
      
      expect(response.status).toBe(201);
    });

    it('应该保留原始响应的 body', async () => {
      const originalBody = { message: 'Hello' };
      const originalResponse = new Response(JSON.stringify(originalBody), {
        headers: { 'Content-Type': 'application/json' },
      });
      const request = new Request('https://example.com/api/test');
      
      const response = addCORSHeaders(originalResponse, request);
      const body = await response.json();
      
      expect(body).toEqual(originalBody);
    });
  });

  describe('corsMiddleware', () => {
    it('应该处理 OPTIONS 预检请求', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'OPTIONS',
      });
      
      const response = await corsMiddleware(request, async () => {
        return new Response('Should not reach here');
      });
      
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('应该为非 OPTIONS 请求添加 CORS 头', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
      });
      
      const response = await corsMiddleware(request, async () => {
        return new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      
      const body = await response.json();
      expect(body).toEqual({ data: 'test' });
    });

    it('应该调用处理函数并返回其响应', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
      });
      
      let handlerCalled = false;
      
      const response = await corsMiddleware(request, async () => {
        handlerCalled = true;
        return new Response('Created', { status: 201 });
      });
      
      expect(handlerCalled).toBe(true);
      expect(response.status).toBe(201);
    });

    it('应该使用自定义 CORS 配置', async () => {
      const config: CORSConfig = {
        allowOrigins: ['https://allowed.com'],
        allowMethods: ['GET'],
        allowHeaders: ['X-Custom'],
      };
      
      const request = new Request('https://example.com/api/test', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://allowed.com',
        },
      });
      
      const response = await corsMiddleware(
        request,
        async () => new Response('OK'),
        config
      );
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
    });
  });
});
