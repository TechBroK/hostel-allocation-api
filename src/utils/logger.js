// Lightweight logger abstraction (can swap with Winston/Pino later)
const levels = ["debug", "info", "warn", "error"];

function log(level, ...args) {
  if (!levels.includes(level)) {
    level = "info";
  }
  const ts = new Date().toISOString();
  // Simple structured style; replace with real logger in future
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](`[${ts}] [${level.toUpperCase()}]`, ...args);
}

export const logger = {
  debug: (...a) => log("debug", ...a),
  info: (...a) => log("info", ...a),
  warn: (...a) => log("warn", ...a),
  error: (...a) => log("error", ...a)
};

export default logger;
