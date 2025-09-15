import { jest } from '@jest/globals';
import { createRoomService } from '../src/services/controllers/roomService.js';
import Room from '../src/models/Room.js';
import Hostel from '../src/models/Hostel.js';

describe('roomService.createRoomService', () => {
  beforeEach(() => {
    Room.findOne = jest.fn();
    Room.create = jest.fn();
    Hostel.findById = jest.fn();
  });
  afterEach(() => jest.clearAllMocks());

  it('throws validation error when required fields missing', async () => {
    await expect(createRoomService('h1', { roomNumber: null, type: 'standard', capacity: 2 })).rejects.toThrow('roomNumber, type and capacity are required');
  });

  it('throws not found when hostel missing', async () => {
    Hostel.findById.mockResolvedValue(null);
    await expect(createRoomService('h1', { roomNumber: '101', type: 'standard', capacity: 2 })).rejects.toThrow('Hostel not found');
  });

  it('throws validation when duplicate room number', async () => {
    Hostel.findById.mockResolvedValue({ _id: 'h1' });
    Room.findOne.mockResolvedValue({ _id: 'r1' });
    await expect(createRoomService('h1', { roomNumber: '101', type: 'standard', capacity: 2 })).rejects.toThrow('Room number already exists in this hostel');
  });

  it('creates room successfully', async () => {
    Hostel.findById.mockResolvedValue({ _id: 'h1' });
    Room.findOne.mockResolvedValue(null);
    Room.create.mockResolvedValue({ _id: 'r2' });
    const res = await createRoomService('h1', { roomNumber: '102', type: 'standard', capacity: 2 });
    expect(res).toEqual({ id: 'r2', status: 'created' });
  });
});
