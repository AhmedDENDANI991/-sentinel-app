import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate, paginationSchema, paginatedResponse } from '../src/utils/validation.js';
import { AppError } from '../src/utils/errors.js';

describe('Validation utilities', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().int().positive().optional(),
  });

  it('should validate correct data', () => {
    const result = validate(testSchema, { name: 'Test', email: 'test@example.com' });
    expect(result.name).toBe('Test');
    expect(result.email).toBe('test@example.com');
  });

  it('should throw AppError on invalid data', () => {
    expect(() => validate(testSchema, { name: '', email: 'not-email' })).toThrow();
    try {
      validate(testSchema, { name: '', email: 'bad' });
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
      expect(e.message).toBe('Validation error');
    }
  });

  it('should validate pagination with defaults', () => {
    const result = validate(paginationSchema, {});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortOrder).toBe('desc');
  });

  it('should reject invalid pagination', () => {
    expect(() => validate(paginationSchema, { page: 0 })).toThrow();
    expect(() => validate(paginationSchema, { limit: 200 })).toThrow();
  });

  it('should format paginated response correctly', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(items, 50, { page: 2, limit: 10, sortOrder: 'desc' as const });
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(50);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(5);
  });
});

describe('Error utilities', () => {
  it('AppError should carry status code', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('AppError');
  });
});
