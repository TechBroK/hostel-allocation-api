// src/controllers/adminController.js

import { listStudentsService, listRecentStudentsService, createAdminUserService, updateStudentStatusService, getSummaryService, exportReportService } from '../services/controllers/adminService.js';

export const listStudents = async (req, res, next) => {
  try { return res.json(listStudentsService(req.query)); } catch (err) { return next(err); }
};

export const listRecentStudents = async (req, res, next) => {
  try { return res.json(await listRecentStudentsService({ hours: req.query.hours, limit: req.query.limit })); } catch (err) { return next(err); }
};

  // Super-admin creates an admin user
export const createAdminUser = async (req, res, next) => {
  try { const result = await createAdminUserService(req.validated || req.body); return res.status(201).json(result); } catch (err) { return next(err); }
};
export const updateStudentStatus = async (req, res, next) => {
  try { const { studentId } = req.params; const { status } = req.validated || req.body; return res.json(await updateStudentStatusService(studentId, status)); } catch (err) { return next(err); }
};

export const getSummary = async (req, res, next) => { try { return res.json(await getSummaryService()); } catch (err) { return next(err); } };

export const exportReport = async (req, res, next) => {
  try { const { type='allocations', format='csv' } = req.query; const { filename, csv } = await exportReportService({ type, format }); res.header('Content-Type','text/csv'); res.attachment(filename); return res.send(csv); } catch (err) { return next(err); }
};
