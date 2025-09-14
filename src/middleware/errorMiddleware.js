import AppError from "../errors/AppError.js";
import logger from "../utils/logger.js";

export function notFound(req, res, next) {
  const err = new AppError(`Not Found - ${req.originalUrl}`, { statusCode: 404, code: "ROUTE_NOT_FOUND" });
  next(err);
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || "Internal Server Error",
    code: err.code || (status === 500 ? "SERVER_ERROR" : undefined)
  };
  if (err.details) response.details = err.details;

  // Log structured error
  logger.error("Request error", {
    method: req.method,
    url: req.originalUrl,
    status,
    code: response.code,
    message: response.message
  });

  res.status(status).json(response);
}
