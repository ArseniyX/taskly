import { describe, it, expect, vi } from 'vitest';
import { AIQueryGeneratorService } from '../ai-query-generator.server';

describe('AIQueryGeneratorService', () => {
  const service = new AIQueryGeneratorService();
  const mockAdmin = {} as any; // Mock admin context

  describe('generateGraphQLQuery', () => {
    it('should generate product query for product-related queries', async () => {
      const result = await service.generateGraphQLQuery(mockAdmin, 'show products');

      expect(result.query).toContain('products');
      expect(result.query).toContain('id');
      expect(result.query).toContain('title');
      expect(result.variables).toEqual({ first: 10 });
      expect(result.summary).toContain('products');
    });

    it('should generate order query for order-related queries', async () => {
      const result = await service.generateGraphQLQuery(mockAdmin, 'show orders');

      expect(result.query).toContain('orders');
      expect(result.query).toContain('name');
      expect(result.summary).toContain('orders');
    });

    it('should generate customer query for customer-related queries', async () => {
      const result = await service.generateGraphQLQuery(mockAdmin, 'list customers');

      expect(result.query).toContain('customers');
      expect(result.query).toContain('displayName');
      expect(result.summary).toContain('customer');
    });

    it('should default to products for ambiguous queries', async () => {
      const result = await service.generateGraphQLQuery(mockAdmin, 'show me data');

      expect(result.query).toContain('products');
      expect(result.summary).toContain('products');
    });

    it('should return mock data with proper structure', async () => {
      const result = await service.generateGraphQLQuery(mockAdmin, 'show products');

      expect(result.executionResult).toBeDefined();
      expect(result.executionResult.products).toBeDefined();
      expect(result.executionResult.products.edges).toBeInstanceOf(Array);
      expect(result.executionResult.products.edges.length).toBeGreaterThan(0);
    });
  });
});