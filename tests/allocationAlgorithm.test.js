/*
 Basic tests for allocationAlgorithm computeCompatibility and range derivation.
 Further tests (API integration, caching behavior, adaptive weights) can be added later.
*/
import mongoose from 'mongoose';
import { computeCompatibility, classifyCompatibilityRange } from '../src/services/allocationAlgorithm.js';

// Helper to fabricate students with traits quickly
function makeStudent(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    personalityTraits: {
      sleepPattern: 'earlyBird',
      studyPreference: 'quiet',
      cleanliness: 'neat',
      socialPreference: 'introvert',
      musicPreference: 'soft',
      roomTemperature: 'cool',
      ...overrides.personalityTraits,
    },
    department: overrides.department || 'CS',
    level: overrides.level || 200,
    gender: overrides.gender || 'male',
  };
}

describe('computeCompatibility', () => {
  test('identical trait sets yield veryHigh range', () => {
    const a = makeStudent();
    const b = makeStudent();
    const { score, range } = computeCompatibility(a, b);
    expect(score).toBeGreaterThanOrEqual(85);
    expect(range).toBe('veryHigh');
  });

  test('completely different opposing traits lowers score', () => {
    const a = makeStudent();
    const b = makeStudent({
      personalityTraits: {
        sleepPattern: 'nightOwl',
        studyPreference: 'group',
        cleanliness: 'messy',
        socialPreference: 'extrovert',
        musicPreference: 'loud',
        roomTemperature: 'warm',
      },
    });
    const { score, range } = computeCompatibility(a, b);
    expect(score).toBeLessThan(70); // Should fall out of high tier
    expect(['low','moderate','high']).toContain(range); // not necessarily deterministic but should not be veryHigh
  });

  test('range classification boundaries', () => {
    expect(classifyCompatibilityRange(92)).toBe('veryHigh');
    expect(classifyCompatibilityRange(85)).toBe('veryHigh');
    expect(classifyCompatibilityRange(84.9)).toBe('high');
    expect(classifyCompatibilityRange(70)).toBe('high');
    expect(classifyCompatibilityRange(69.9)).toBe('moderate');
    expect(classifyCompatibilityRange(55)).toBe('moderate');
    expect(classifyCompatibilityRange(54.9)).toBe('low');
  });
});
