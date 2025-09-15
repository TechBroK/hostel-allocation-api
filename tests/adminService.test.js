import { jest } from '@jest/globals';
import User from '../src/models/User.js';
import Allocation from '../src/models/Allocation.js';
import Room from '../src/models/Room.js';
import { listStudentsService, exportReportService } from '../src/services/controllers/adminService.js';

function mockQuery(returnValue) {
  return { select: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(returnValue) };
}

describe('adminService.listStudentsService', () => {
  beforeEach(() => {
    // stub methods fresh each test
    User.find = jest.fn();
    User.countDocuments = jest.fn();
    Allocation.findOne = jest.fn();
  });
  afterEach(() => jest.clearAllMocks());

  it('returns paged students with allocation status pending when no allocation', async () => {
    const userDocs = [ { _id: 'u1', fullName: 'Alice', matricNumber: 'MAT1', level: '100', email: 'a@x.com' } ];
    User.find.mockReturnValue({
      select: () => ({
        skip: () => ({
          limit: () => userDocs
        })
      })
    });
    User.countDocuments.mockResolvedValue(1);
    Allocation.findOne.mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });

    const res = await listStudentsService({ page: 1, limit: 10 });
  expect(res.data[0]).toMatchObject({ fullName: 'Alice', status: 'pending' });
  expect(res.meta.total).toBe(1);
  });

  it('marks student allocated when allocation exists', async () => {
    const userDocs = [ { _id: 'u2', fullName: 'Bob', matricNumber: 'MAT2', level: '200', email: 'b@x.com' } ];
    User.find.mockReturnValue({
      select: () => ({
        skip: () => ({
          limit: () => userDocs
        })
      })
    });
    User.countDocuments.mockResolvedValue(1);
    Allocation.findOne.mockReturnValue({ sort: () => ({ lean: () => Promise.resolve({ status: 'allocated' }) }) });

    const res = await listStudentsService({ page: 1, limit: 10 });
  expect(res.data[0]).toMatchObject({ fullName: 'Bob', status: 'allocated' });
  });
});

describe('adminService.exportReportService', () => {
  beforeEach(() => {
    User.find = jest.fn();
    Room.find = jest.fn();
    Allocation.find = jest.fn();
  });
  afterEach(() => jest.clearAllMocks());

  it('exports students csv with correct header', async () => {
  User.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ _id: 'u1', fullName: 'Al', matricNumber: 'M1', email: 'e@e', level: '100' }]) }) });
    const { filename, csv } = await exportReportService({ type: 'students', format: 'csv' });
    expect(filename).toBe('students.csv');
    expect(csv.split('\n')[0]).toBe('id,fullName,matricNumber,email,level');
  });

  it('exports rooms csv with correct header', async () => {
  Room.find.mockReturnValue({ populate: () => ({ lean: () => Promise.resolve([{ _id: 'r1', hostel: { name: 'H1' }, roomNumber: '101', type: 'standard', capacity: 4, occupied: 2 }]) }) });
    const { filename, csv } = await exportReportService({ type: 'rooms', format: 'csv' });
    expect(filename).toBe('rooms.csv');
    expect(csv.split('\n')[0]).toBe('id,hostel,roomNumber,type,capacity,occupied');
  });

  it('exports allocations csv with correct header as default', async () => {
  Allocation.find.mockReturnValue({ populate: () => ({ populate: () => ({ lean: () => Promise.resolve([{ _id: 'a1', student: { fullName: 'Al', matricNumber: 'M1' }, room: { roomNumber: '101' }, status: 'allocated', allocatedAt: 'date' }]) }) }) });
    const { filename, csv } = await exportReportService({});
    expect(filename).toBe('allocations.csv');
    expect(csv.split('\n')[0]).toBe('id,student,matricNumber,roomNumber,status,allocatedAt');
  });

  it('throws on unsupported format', async () => {
    await expect(exportReportService({ type: 'students', format: 'json' })).rejects.toThrow('Only csv export supported');
  });
});
