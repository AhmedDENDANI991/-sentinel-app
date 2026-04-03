import { describe, it, expect } from 'vitest';
import { getValidTransitions, OBJECT_STATES } from '../src/services/stateMachine.js';

describe('State Machine', () => {
  it('should define all 16 states', () => {
    expect(OBJECT_STATES).toHaveLength(16);
    expect(OBJECT_STATES).toContain('RECEIVED');
    expect(OBJECT_STATES).toContain('ARCHIVED');
    expect(OBJECT_STATES).toContain('VALIDATED_PROOF');
    expect(OBJECT_STATES).toContain('PENDING_HUMAN');
  });

  it('RECEIVED should only transition to FINGERPRINTED', () => {
    const transitions = getValidTransitions('RECEIVED');
    expect(transitions).toEqual(['FINGERPRINTED']);
  });

  it('FINGERPRINTED should only transition to CLASSIFIED_PROVISIONAL', () => {
    const transitions = getValidTransitions('FINGERPRINTED');
    expect(transitions).toEqual(['CLASSIFIED_PROVISIONAL']);
  });

  it('CLASSIFIED_PROVISIONAL should allow EXTRACTABLE or NOT_EXTRACTABLE', () => {
    const transitions = getValidTransitions('CLASSIFIED_PROVISIONAL');
    expect(transitions).toContain('EXTRACTABLE');
    expect(transitions).toContain('NOT_EXTRACTABLE');
    expect(transitions).toHaveLength(2);
  });

  it('VALIDATED_PROOF should only transition to ARCHIVED', () => {
    const transitions = getValidTransitions('VALIDATED_PROOF');
    expect(transitions).toEqual(['ARCHIVED']);
  });

  it('ARCHIVED should be terminal (no transitions)', () => {
    const transitions = getValidTransitions('ARCHIVED');
    expect(transitions).toEqual([]);
  });

  it('PENDING_HUMAN should have many transition options (human can redirect)', () => {
    const transitions = getValidTransitions('PENDING_HUMAN');
    expect(transitions.length).toBeGreaterThan(5);
    expect(transitions).toContain('VALIDATED_PROOF');
    expect(transitions).toContain('REJECTED_MOTIVATED');
    expect(transitions).toContain('EXCLUDED_MOTIVATED');
  });

  it('CONTROL_CROSS should allow validation, reserve, pending, or rejection', () => {
    const transitions = getValidTransitions('CONTROL_CROSS');
    expect(transitions).toContain('VALIDATED_PROOF');
    expect(transitions).toContain('VALIDATED_RESERVE');
    expect(transitions).toContain('PENDING_HUMAN');
    expect(transitions).toContain('REJECTED_MOTIVATED');
  });

  it('no state should transition to RECEIVED (entry point only)', () => {
    for (const state of OBJECT_STATES) {
      const transitions = getValidTransitions(state);
      expect(transitions).not.toContain('RECEIVED');
    }
  });

  it('should return empty array for unknown state', () => {
    const transitions = getValidTransitions('NONEXISTENT');
    expect(transitions).toEqual([]);
  });
});
