// src/middleware/roleMiddleware.js

/**
 * Middleware to restrict access to certain roles
 * Usage: router.get("/admin", protect, permit("admin"), controllerFn)
 */
export const permit = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
};
