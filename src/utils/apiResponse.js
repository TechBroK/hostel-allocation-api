// Standardized API success & error helpers (additive, non-breaking)
export function success(res, { data = null, message = null, meta = null, statusCode = 200 } = {}) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== null) payload.data = data;
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

export function error(res, { message = "Internal Server Error", statusCode = 500, code = undefined, errors = undefined } = {}) {
  const payload = { success: false, message };
  if (code) payload.code = code;
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}
