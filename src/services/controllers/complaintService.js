import Complaint from '../../models/Complaint.js';
import { ValidationError, ForbiddenError } from '../../errors/AppError.js';
import { getPaginationParams, buildPagedResponse } from '../../utils/pagination.js';

export async function createComplaintService({ requester, studentId, payload }) {
  if (requester.role !== 'admin' && requester._id.toString() !== studentId) { throw new ForbiddenError(); }
  const { type, description } = payload;
  if (!type || !description) { throw new ValidationError('type and description required'); }
  const complaint = await Complaint.create({ student: studentId, type, description, status: 'Pending', response: null });
  return complaint;
}

export async function getComplaintsByStudentService({ requester, studentId, query }) {
  if (requester.role !== 'admin' && requester._id.toString() !== studentId) { throw new ForbiddenError(); }
  const { page, limit, skip } = getPaginationParams(query);
  const [complaints, total] = await Promise.all([
    Complaint.find({ student: studentId }).sort({ date: -1 }).skip(skip).limit(limit),
    Complaint.countDocuments({ student: studentId })
  ]);
  return buildPagedResponse({ items: complaints, total, page, limit });
}

export default { createComplaintService, getComplaintsByStudentService };