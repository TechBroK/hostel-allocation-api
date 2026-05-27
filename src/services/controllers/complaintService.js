import Complaint from '../../models/Complaint.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';
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

export async function updateComplaintService({ requester, complaintId, payload }) {
  if (requester.role !== 'admin') { throw new ForbiddenError('Admin only'); }
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) { throw new NotFoundError('Complaint not found'); }
  if (typeof payload.status !== 'undefined') complaint.status = payload.status;
  if (typeof payload.response !== 'undefined') complaint.response = payload.response;
  await complaint.save();
  return { id: complaint._id, status: complaint.status, response: complaint.response };
}

export default { createComplaintService, getComplaintsByStudentService, updateComplaintService };