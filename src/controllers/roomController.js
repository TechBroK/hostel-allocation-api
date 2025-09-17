// src/controllers/roomController.js
import { createRoomService, listRoomsByHostelService, getRoomService, listUnallocatedRoomsService } from '../services/controllers/roomService.js';

/**
 * @desc    Create a new room in a hostel (Admin only)
 * @route   POST /api/rooms/:hostelId/rooms
 * @access  Admin
 */
export const createRoom = async (req, res, next) => { try { const { hostelId } = req.params; const result = await createRoomService(hostelId, req.validated || req.body); return res.status(201).json(result); } catch (err) { return next(err); } };

/**
 * @desc    List all rooms in a hostel
 * @route   GET /api/rooms/hostel/:hostelId
 * @access  Public
 */
export const listRoomsByHostel = async (req, res, next) => { try { const { hostelId } = req.validated || req.params; return res.json(await listRoomsByHostelService(hostelId, req.query)); } catch (err) { return next(err); } };

/**
 * @desc    Get details of a single room
 * @route   GET /api/rooms/:id
 * @access  Public
 */
export const getRoom = async (req, res, next) => { try { const { id } = req.validated || req.params; return res.json(await getRoomService(id)); } catch (err) { return next(err); } };

// List rooms with remaining capacity (admin)
export const listUnallocatedRooms = async (req, res, next) => { try { return res.json(await listUnallocatedRoomsService(req.query)); } catch (err) { return next(err); } };
