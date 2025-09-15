import { submitStudentAllocation } from '../src/services/allocationSubmission.js';

// Minimal unit test focused on an error branch (session missing)
describe('submitStudentAllocation service (minimal)', () => {
  test('throws when session missing', async () => {
    await expect(submitStudentAllocation({ session: null, studentId: 'stub' })).rejects.toThrow(/Session required/);
  });
});