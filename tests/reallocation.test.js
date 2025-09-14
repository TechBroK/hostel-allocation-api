import mongoose from 'mongoose';
import { computeCompatibility } from '../src/services/allocationAlgorithm.js';

// This is a lightweight structural test for reallocation compatibility logic assumptions.
// In a full integration test we'd spin up an in-memory MongoDB and exercise the endpoint.

describe('Reallocation compatibility assumptions', () => {
  function mkTraits(overrides = {}) {
    return {
      sleepSchedule: 'early',
      studyHabits: 'quiet',
      cleanlinessLevel: 4,
      socialPreference: 'balanced',
      noisePreference: 'quiet',
      hobbies: ['reading'],
      musicPreference: 'jazz',
      visitorFrequency: 'rarely',
      ...overrides,
    };
  }
  function mkUser(traits) {
    return { _id: new mongoose.Types.ObjectId(), personalityTraits: traits };
  }
  test('moderate+ compatibility passes threshold', () => {
    const a = mkUser(mkTraits());
    const b = mkUser(mkTraits({ cleanlinessLevel: 3 }));
    const { range } = computeCompatibility(a, b);
    expect(['veryHigh','high','moderate']).toContain(range);
  });
  test('low compatibility fails threshold', () => {
    const a = mkUser(mkTraits({ sleepSchedule: 'early', cleanlinessLevel: 5 }));
    const b = mkUser(mkTraits({ sleepSchedule: 'late', cleanlinessLevel: 1, noisePreference: 'noisy' }));
    const { range } = computeCompatibility(a, b);
    // range should be low or at least not accepted
    expect(range === 'low' || !['veryHigh','high','moderate'].includes(range)).toBe(true);
  });
});
