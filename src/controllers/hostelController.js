// src/controllers/hostelController.js
import { createHostelService, listHostelsService, getHostelRoomsService } from '../services/controllers/hostelService.js';

export const createHostel = async (req, res, next) => { try { const result = await createHostelService(req.validated || req.body); return res.status(201).json(result); } catch (err) { return next(err); } };

export const listHostels = async (req, res, next) => { try { return res.json(await listHostelsService(req.query)); } catch (err) { return next(err); } };

export const getHostelRooms = async (req, res, next) => { try { const { hostelId } = req.validated || req.params; return res.json(await getHostelRoomsService(hostelId)); } catch (err) { return next(err); } };

