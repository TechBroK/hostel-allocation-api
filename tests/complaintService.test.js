import { jest } from '@jest/globals';
import { createComplaintService } from '../src/services/controllers/complaintService.js';
import Complaint from '../src/models/Complaint.js';

describe('complaintService.createComplaintService', () => {
  beforeEach(() => {
    Complaint.create = jest.fn();
  });
  afterEach(() => jest.clearAllMocks());

  const studentUser = { _id: 'stu1', role: 'student', toString(){ return this._id; } };
  const otherStudent = { _id: 'stu2', role: 'student', toString(){ return this._id; } };

  it('forbids creation when requester mismatch', async () => {
    await expect(createComplaintService({ requester: otherStudent, studentId: 'stu1', payload: { type: 'Noise', description: 'Too loud' } })).rejects.toThrow('Forbidden');
  });

  it('validates missing type/description', async () => {
    await expect(createComplaintService({ requester: studentUser, studentId: 'stu1', payload: { type: '', description: '' } })).rejects.toThrow('type and description required');
  });

  it('creates complaint successfully', async () => {
    Complaint.create.mockResolvedValue({ _id: 'c1', student: 'stu1', type: 'Noise', description: 'Too loud', status: 'Pending' });
    const res = await createComplaintService({ requester: studentUser, studentId: 'stu1', payload: { type: 'Noise', description: 'Too loud' } });
    expect(res).toMatchObject({ _id: 'c1', type: 'Noise' });
  });
});
