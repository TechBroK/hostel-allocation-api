# Architecture & Standardization Guide

This document codifies emerging conventions for the Hostel Allocation API. It is additive and non-breaking. Frontend consumers can continue using existing endpoints while the backend incrementally adopts these standards.

## 1. Layers (Current & Target)

| Layer | Current | Target (Phased) |
|-------|---------|-----------------|
| Routing | Express routers | Same + versioning (v1) eventually |
| Controllers | Business + persistence mixed | Thin controllers calling services |
| Services | (None) | Encapsulate domain logic, transactions |
| Models | Mongoose schemas | Add indexes, timestamps, lean querying |
| Validation | Inline ad-hoc checks | Zod/Joi schemas + middleware |
| Auth | JWT + role middleware | Add refresh token (optional) |
| Responses | Inconsistent shapes | Unified success/error helpers |
| Errors | Inline try/catch | Central AppError hierarchy |
| Logging | console.* | Structured logger (Winston/Pino) |
| Docs | Swagger basic | Component refs + examples |

## 2. Response Conventions

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "meta": { "page": 1, "pageSize": 20, "total": 57 }
}

// Error
{
  "success": false,
  "message": "Resource not found",
  "code": "NOT_FOUND",
  "errors": [ { "field": "email", "message": "Already taken" } ]
}
```
Gradual migration: new endpoints & refactored controllers adopt `apiResponse`.

## 3. Error Handling
- Throw `AppError` (or subclass) when possible instead of `return res.status(...).json(...)`.
- Unhandled errors bubble to `errorHandler`.
- 404 routes go through `notFound` middleware.

## 4. Validation Pattern (Planned)

```javascript
// validators/auth.validator.js
import { z } from 'zod';
export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  matricNumber: z.string().optional(),
  level: z.string().optional(),
  phone: z.string().optional()
});
```
Middleware:

```javascript
export const validate = (schema) => (req,res,next) => {
  const result = schema.safeParse({ ...req.body, ...req.params, ...req.query });
  if (!result.success) {
    return error(res, { statusCode: 400, message: 'Validation failed', code: 'VALIDATION_ERROR', errors: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
  }
  req.validated = result.data;
  next();
};
```

## 5. Suggested Folder Evolution

```text
src/
  services/
    allocationService.js
    roomService.js
  validators/
  errors/
  utils/
```

## 6. Transactions & Concurrency (Planned for Allocation)
- Use MongoDB session for multi-step allocation (check room capacity → create allocation → increment occupancy). Rollback on failure.
- Optionally introduce optimistic locking by storing a `version` or using `$inc` with capacity guards.

## 7. Logging Levels
| Level | Usage |
|-------|-------|
| debug | Detailed internal flow (dev only) |
| info | High-level meaningful events (server start, allocation created) |
| warn | Suspicious but recoverable states |
| error | Unexpected failures |

## 8. Swagger Component Additions (Planned)

```yaml
```yaml
responses:
  400BadRequest:
    description: Validation error
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'
```


        message: { type: string }

| Phase | Scope | Risk |
|-------|-------|------|
| 1 | Infra scaffolding (DONE) | Low |
| 2 | Add validation & refactor Auth controller | Low |
| 3 | Service layer for Allocation & Rooms | Medium |
| 4 | Pagination + filtering conventions | Medium |
| 5 | Logging upgrade + metrics | Medium |
| 6 | Versioned API (v1) + deprecation headers | Medium |
```
Reference example:

- Unit: services & utils
- Integration: route + DB (ephemeral Mongo memory server or test DB)
- Contract: Snapshot Swagger JSON to detect breaking changes
  400BadRequest:
    description: Validation error

- Multi-tenant support
- GraphQL rewrite
- Realtime sockets for allocation updates
          $ref: '#/components/schemas/ErrorResponse'
```

- Should public hostel/room listing remain unauthenticated? (Security vs UX)
- Introduce soft-delete for users/complaints?
- Add rate limit per role tier?
|-------|-------|------|
| 1 | Infra scaffolding (DONE) | Low |
| 2 | Add validation & refactor Auth controller | Low |
| 3 | Service layer for Allocation & Rooms | Medium |
| 4 | Pagination + filtering conventions | Medium |
| 5 | Logging upgrade + metrics | Medium |
| 6 | Versioned API (v1) + deprecation headers | Medium |


## 10. Testing Strategy (Planned)

- Unit: services & utils
- Integration: route + DB (ephemeral Mongo memory server or test DB)
- Contract: Snapshot Swagger JSON to detect breaking changes

## 11. Non-Goals (For Now)

- Multi-tenant support
- GraphQL rewrite
- Realtime sockets for allocation updates

## 12. Open Questions

- Should public hostel/room listing remain unauthenticated? (Security vs UX)
- Introduce soft-delete for users/complaints?
- Add rate limit per role tier?

---
Document maintained alongside `README.md`. Update when introducing new architectural layers.
