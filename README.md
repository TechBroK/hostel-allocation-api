# Hostel Allocation API

A Node.js/Express REST API for managing student hostel allocations, rooms, hostels, complaints, and administrative workflows in a tertiary institution context. The system supports role-based access (student, admin, super-admin) and provides interactive API documentation via Swagger.

---

## ✨ Features

- User registration & authentication (JWT)
- Role-based authorization (student, admin, super-admin)
- Super-admin bootstrap script to seed initial privileged user
- Hostel & Room management (admin)
- Student room allocation submission & admin allocation actions
- Student profile management & avatar upload (multipart/form-data)
- Complaint submission & retrieval
- Basic reporting endpoints (summary/export placeholders)
- Centralized Swagger (OpenAPI 3.0) documentation at `/api-docs`
- Modular route & controller structure
- Gender-aware hostel allocation (user schema now includes optional `gender` enum male/female; enforced against hostel `type`).
- Fairness-based (round-robin) hostel rotation for auto-pairing to reduce bias toward early-listed hostels.
- Conflict resolution worker scans stale pending allocations and attempts fairness-based pairing.
- Structured JSON logging for allocation submissions and reallocations with duration metrics.
- Flexible name handling: registration & admin creation accept either `fullName` or `name` (with `fullName` taking precedence if both provided).

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) |
| Security | Role-based middleware, bcrypt |
| Docs | swagger-ui-express + swagger-jsdoc |
| Uploads | multer |

## 🧪 Testing

### Overview

The test suite uses **Jest** with an **in‑memory MongoDB replica set** (via `mongodb-memory-server`’s `MongoMemoryReplSet`) so that:

- Multi-document transactions used in allocation submission work reliably.
- Tests run isolated with no dependency on a developer’s local Mongo daemon.
- Each test file sees a clean logical database (collections truncated after each test).

### Running Tests
```bash
npm test
```

The project’s Jest config (`jest.config.mjs`) collects coverage and uses `tests/jest.setup.js` for environment bootstrapping.

### Structure

```text
tests/
  jest.setup.js            # Starts replica set & hooks (beforeAll/afterEach/afterAll)
  utils/testDb.js          # Start/stop/clear helpers (replica set abstraction)
  *.test.js                # API + service tests (integration-style)
```

Legacy folders `src/tests` and `src/__tests__` were removed/retired; all new tests should live under `tests/`.


- Replica set (single member, WiredTiger) created once per test run.
- After each test: every collection is truncated (`deleteMany({})`).
- After all tests: DB dropped then replica set stopped.
- No real `MONGO_URI` needed; the in-memory URI is generated dynamically.

### Writing a New Test

1. Create `tests/someFeature.test.js`.
2. Import the Express app directly (`import app from '../src/app.js'`).
3. Use `supertest` to make requests; no need to listen on a port.

Example:

```js
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';

describe('Example feature', () => {
  test('creates a user', async () => {
    await User.create({ fullName: 'Test', email: 'ex@example.com', password: 'Pass1234!', role: 'student' });
    const res = await request(app).get('/api/students?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
```

### Allocation Transaction Tests
Allocation submission starts a MongoDB transaction. If you ever see:

```text
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

It means a test bypassed the replica set initialization (e.g., misconfigured Jest setup). Verify `jest.setup.js` is executing and you’re not manually calling `mongoose.connect` in an individual test file.

### Handling Transient Write Conflicts

Transient error code `112` (catalog changes / write conflict) is retried automatically in the `submitAllocation` controller (with exponential backoff). In tests you’ll sometimes see a log:

```text
allocation.submit.retry

This is expected under heavy parallel test writes and not a failure.

### Coverage

Coverage thresholds are intentionally modest initially. To raise:

1. Improve branch coverage in controllers (error paths).
2. Add unit tests for utilities under `src/utils/` currently at 0%.
3. Expand service-layer edge cases (room selection fallbacks, complaint validation branches, etc.).

### Coverage (Quick)

Add tests for controller error paths, utility modules, and allocation edge cases to raise coverage beyond ~34%.

### Troubleshooting (Quick)

| Symptom | Fix |
|---------|-----|
| Transaction number error | Ensure in-memory replica set (jest setup) ran |
| Hanging tests | Remove `app.listen` in tests / await async ops |
| Flaky allocation writes | Expected retries (code 112) — investigate only if persistent |
| Low coverage | Expand tests; verify `collectCoverageFrom` globs |

## 🧾 Example Login Request

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"Passw0rd!"}'
```

Response:

```json
{
  "token": "<jwt>",
  "user": { "_id": "...", "email": "student@example.com", "role": "student" }
}
```

---

## 🧑‍💼 Admin vs Super-Admin Capabilities

| Action | student | admin | super-admin |
|--------|---------|-------|-------------|
| Register / Login | ✅ | ✅ | ✅ |
| Submit allocation | ✅ | ✅ | ✅ |
| Manage hostels / rooms | ❌ | ✅ | ✅ |
| Create admin user | ❌ | ✅ | ✅ |
| Export reports | ❌ | ✅ | ✅ |

---

## 📊 Pagination & Metadata

List endpoints (e.g., `/api/hostels`, `/api/rooms/hostel/:hostelId`, `/api/allocations`, `/api/admin/students`) accept query params:

```text
?page=1&limit=20
```
Response format:

```json
{
  "data": [ ...items ],
  "meta": { "page": 1, "limit": 20, "total": 57, "pageCount": 3 }
}
```

Defaults: `page=1`, `limit=20`, max limit = 100.

---

## 🩺 Health Check

`GET /healthz` returns service + database connectivity snapshot:

```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-09-14T10:11:12.345Z",
  "db": "connected"
}
```
```

---

## 🧰 Linting & Formatting

Project uses ESLint (flat config) + Prettier.

Scripts:

```bash
npm run lint      # analyze code
npm run lint:fix  # auto-fix where possible
```
Prettier settings in `.prettierrc` (width 90, double quotes, semicolons). Editor settings normalized by `.editorconfig`.
```

---

## ❗ Standard Error Shape (suggested)

```json
{
  "message": "Invalid token"
}
```

(Enhancement idea: Introduce a consistent error wrapper with `code`, `details`, etc.)

---

## 🧱 Architecture Notes

- ES Modules enabled via `"type": "module"`
- Helmet for HTTP headers (recommended hardening; add if not present yet)
- Password complexity validation
- Potential refresh token rotation strategy (future enhancement if sessions added)


## 🧩 Compatibility & Allocation Algorithm (Summary)

Students can optionally supply lifestyle & preference traits (sleep schedule, study habits, social preference, cleanliness, hobbies, etc.). These are normalized to numeric vectors; pair compatibility = weighted cosine similarity blended with hobby/music affinity and penalties for extreme conflicts. Scores map to ranges (veryHigh/high/moderate/low) that drive auto-pairing decisions and admin review.

Key behaviors:
- Auto-pairing on submission if a high/veryHigh counterpart exists and a suitably capacious room is available.
- Reallocation uses the same compatibility guardrails (must be ≥ moderate with all occupants).
- Transactions wrap allocation & reallocation to avoid race conditions.
- Adaptive weighting lightly reinforces historically successful (approved) pair traits.

Full algorithm, trait schema, ranges, caching and future ML roadmap: see `docs/compatibility.md`.

## 🧭 Roadmap Ideas

- Notifications/email integration
- Soft deletes & audit logs
- Admin dashboard metrics & dashboards
- CI pipeline, Docker image & deployment templates
- ML-driven adaptive compatibility weighting

## 🤝 Contribution Guide (Lightweight)

1. Fork & branch: `feat/<short-name>`
2. Follow existing code style
3. Add/Update Swagger annotations for new endpoints
4. Add tests for new logic
5. Open PR with description + screenshots (if applicable)

---

## 🧹 Maintenance Tips

- Keep `swagger.js` schemas updated as models evolve
- Consider extracting validation (e.g., Joi/Zod) for request payloads
- Add a logger (Winston / Pino) instead of `console.log` for production

### Current Logging Implementation (Pino)

This project now uses `pino` for structured logging. Core allocation operations emit events:

Events:

- `allocation.submit.success|error`
- `allocation.reallocate.success|error`
- `conflictResolver.start|cycle|disabled|error`

Set log level via `LOG_LEVEL` (default `info`). Example `.env` addition:

```bash
LOG_LEVEL=debug
```

Sample output line (JSON):

```json
{"level":30,"time":"2025-09-14T12:00:00.000Z","event":"allocation.submit.success","allocationId":"...","paired":true,"compatibilityRange":"high","durationMs":57}
```

For pretty local viewing:

```bash
node src/app.js | npx pino-pretty
```

You can ship these logs directly to ELK / Loki / CloudWatch without transformation.

---

## 📄 License

ISC (adjust if needed)

---

## 🙌 Acknowledgements

Built with ❤️ using Express & MongoDB.

---

## 📬 Support

Open an issue or contact the maintainer if you run into problems.

---

Happy building!
