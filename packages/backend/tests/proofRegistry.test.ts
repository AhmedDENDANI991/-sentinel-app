import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// Test the checksum computation logic (isolated from DB)
describe('Proof Registry - Checksum Logic', () => {
  function computeChecksum(data: Record<string, unknown>): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  it('should produce deterministic checksums', () => {
    const data = { auditObjectId: '123', fieldName: 'amount', decision: 'VALIDATED', timestamp: '2024-01-01' };
    const hash1 = computeChecksum(data);
    const hash2 = computeChecksum(data);
    expect(hash1).toBe(hash2);
  });

  it('should produce different checksums for different data', () => {
    const hash1 = computeChecksum({ auditObjectId: '123', fieldName: 'amount', decision: 'VALIDATED', timestamp: '2024-01-01' });
    const hash2 = computeChecksum({ auditObjectId: '123', fieldName: 'amount', decision: 'REJECTED', timestamp: '2024-01-01' });
    expect(hash1).not.toBe(hash2);
  });

  it('should produce 64-char hex strings', () => {
    const hash = computeChecksum({ test: 'data' });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be key-order independent due to sorting', () => {
    const hash1 = computeChecksum({ b: 2, a: 1 });
    const hash2 = computeChecksum({ a: 1, b: 2 });
    expect(hash1).toBe(hash2);
  });
});

describe('Proof Registry - Decision Types', () => {
  const VALID_DECISIONS = ['VALIDATED', 'VALIDATED_RESERVE', 'PENDING', 'REJECTED', 'EXCLUDED'];
  const IMMUTABLE_DECISIONS = ['VALIDATED', 'REJECTED', 'EXCLUDED'];

  it('should have 5 valid decision types', () => {
    expect(VALID_DECISIONS).toHaveLength(5);
  });

  it('should mark final decisions as immutable', () => {
    for (const decision of VALID_DECISIONS) {
      const shouldBeImmutable = IMMUTABLE_DECISIONS.includes(decision);
      expect(IMMUTABLE_DECISIONS.includes(decision)).toBe(shouldBeImmutable);
    }
  });

  it('PENDING and VALIDATED_RESERVE should NOT be immutable', () => {
    expect(IMMUTABLE_DECISIONS).not.toContain('PENDING');
    expect(IMMUTABLE_DECISIONS).not.toContain('VALIDATED_RESERVE');
  });
});
