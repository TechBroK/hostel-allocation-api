import { jest } from '@jest/globals';
import { listHostelsService, getHostelRoomsService } from '../src/services/controllers/hostelService.js';
import Hostel from '../src/models/Hostel.js';
import Room from '../src/models/Room.js';

function mockQuery(returnValue) {
  return { skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(returnValue) };
}

describe('hostelService.listHostelsService', () => {
  beforeEach(() => {
    Hostel.find = jest.fn();
    Hostel.countDocuments = jest.fn();
    Room.find = jest.fn();
  });
  afterEach(() => jest.clearAllMocks());

  it('aggregates occupancy and available correctly', async () => {
    const hostels = [{ _id: 'h1', name: 'Alpha', type: 'male', capacity: 10 }];
  Hostel.find.mockReturnValue(mockQuery(hostels));
    Hostel.countDocuments.mockResolvedValue(1);
    // rooms for hostel h1
    Room.find.mockReturnValue({
      lean: () => Promise.resolve([
        { _id: 'r1', roomNumber: '101', type: 'std', capacity: 4, occupied: 2 },
        { _id: 'r2', roomNumber: '102', type: 'std', capacity: 4, occupied: 1 }
      ])
    });

  const res = await listHostelsService({ page:1, limit:10 });
  expect(res.data[0]).toMatchObject({ occupied: 3, available: 7 });
  expect(res.meta.total).toBe(1);
  });
});

describe('hostelService.getHostelRoomsService', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws not found when Room.find returns null', async () => {
    Room.find.mockReturnValue({ lean: () => Promise.resolve(null) });
    await expect(getHostelRoomsService('h1')).rejects.toThrow('Hostel or rooms not found');
  });

  it('returns rooms array when found', async () => {
    Room.find.mockReturnValue({ lean: () => Promise.resolve([{ _id: 'r1' }]) });
    const res = await getHostelRoomsService('h1');
    expect(res).toEqual([{ _id: 'r1' }]);
  });
});
