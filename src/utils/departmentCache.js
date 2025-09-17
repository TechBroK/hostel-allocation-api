// Simple in-memory cache for departments; currently static import but future-ready for DB fetch.
import { LASU_DEPARTMENTS } from '../config/departments.js';

let cached = null;
let lastLoad = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getDepartments(force = false) {
  const now = Date.now();
  if (force || !cached || (now - lastLoad) > TTL_MS) {
    // If later migrated to Mongo, perform fetch here.
    cached = [...LASU_DEPARTMENTS];
    lastLoad = now;
  }
  return cached;
}

export function clearDepartmentCache() {
  cached = null; lastLoad = 0;
}
