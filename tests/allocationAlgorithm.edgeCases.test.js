import mongoose from 'mongoose';
import { computeCompatibility } from '../src/services/allocationAlgorithm.js';

function makeStudent(traits = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    personalityTraits: traits,
  };
}

describe('computeCompatibility edge cases', () => {
  test('empty traits objects yield neutral-ish score', () => {
    const a = makeStudent();
    const b = makeStudent();
    const { score } = computeCompatibility(a, b);
    expect(score).toBeGreaterThan(40); // baseline should not collapse to near-zero
    expect(score).toBeLessThan(90);
  });

  test('partial overlap vs empty still produces stable score', () => {
    const a = makeStudent({ sleepSchedule: 'late', cleanlinessLevel: 5 });
    const b = makeStudent();
    const { score } = computeCompatibility(a, b);
    expect(score).toBeGreaterThan(30);
  });

  test('high divergence with extremes triggers penalties', () => {
    const a = makeStudent({ sleepSchedule: 'early', cleanlinessLevel: 5, noisePreference: 'quiet' });
    const b = makeStudent({ sleepSchedule: 'late', cleanlinessLevel: 1, noisePreference: 'noisy' });
    const { score } = computeCompatibility(a, b);
    // Should fall into moderate or low because of penalties
    expect(score).toBeLessThan(80);
  });
});
