// src/controllers/complaintController.js
import { createComplaintService, getComplaintsByStudentService } from '../services/controllers/complaintService.js';

export const createComplaint = async (req, res, next) => { try { const { studentId } = req.params; const complaint = await createComplaintService({ requester: req.user, studentId, payload: req.validated || req.body }); return res.status(201).json(complaint); } catch (err) { return next(err); } };

export const getComplaintsByStudent = async (req, res, next) => { try { const { studentId } = req.params; return res.json(await getComplaintsByStudentService({ requester: req.user, studentId, query: req.query })); } catch (err) { return next(err); } };
