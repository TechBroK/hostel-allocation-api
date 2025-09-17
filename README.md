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

## � Example Login Request

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

{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-09-14T10:11:12.345Z",
  "db": "connected"
}
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

npm run lint:fix && npm run lint
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

---
- Helmet for HTTP headers
- Password complexity validation
- Refresh token rotation strategy (if sessions needed)


## 🧩 Compatibility & Allocation Algorithm

  "sleepSchedule": "early|flexible|late",
  "cleanlinessLevel": 1,
  "socialPreference": "introvert|balanced|extrovert",
  "noisePreference": "quiet|tolerant|noisy",
  "hobbies": ["reading","basketball"],
  "musicPreference": "afrobeat",
  "visitorFrequency": "rarely|sometimes|often"
}

Categorical traits are mapped to a 0..1 scale (e.g. `early -> 0`, `flexible -> 0.5`, `late -> 1`). `cleanlinessLevel` (1–5) is scaled to 0..1. Hobbies use Jaccard similarity; music is exact match or neutral (0.5 if unspecified).

### Similarity Calculation

1. Base vector similarity (default: weighted cosine). Optional weighted Euclidean can be toggled.
2. Affinity (hobbies + music) blended at 25% weight.
3. Penalties applied for extreme mismatches (sleep, cleanliness, noise) > 0.8 distance.
4. Result scaled to integer percentage (0–100).

### Compatibility Ranges (Updated)

| Range | Score | Meaning | Default Status |
|-------|-------|---------|----------------|
| veryHigh | 85–100 | Exceptional alignment | auto-pair (capacity permitting) |
| high | 70–84 | Strong match | suggest / fast-track |
| moderate | 55–69 | Viable but review | needs-admin |
| low | <55 | Poor fit | reject |

### Endpoint: Match Suggestions

### Admin Approval & Adaptive Weights

Persisted approvals stored in `ApprovedPairing`.

Endpoints:

- `POST /api/allocations/approve-pairing` (admin)
- `GET /api/allocations/approved-pairings` (admin)


Every 25 approvals lightly boosts cleanliness & sleep weights (demo adaptation).

### Personality Traits Update

`PUT /api/students/:studentId/personality` updates trait profile; cached suggestions automatically invalidate via signature change.

### Suggestions Caching

In-memory TTL cache (5 minutes) keyed by `studentId|traitSignature` to avoid recomputation for unchanged traits.

### Auto Allocation

Two mechanisms now reduce admin overhead:

1. Student submission auto-pairing: when a student submits an allocation request, the system attempts to find a compatible (veryHigh/high) pending student and selects the "best" room (heuristic: highest free capacity ratio, light jitter tie-break) with at least 2 free slots. If successful, both are immediately approved and assigned inside a MongoDB transaction.
2. Admin batch auto allocation (legacy): `POST /api/allocations/auto-allocate` can still be used for explicit pairing when needed.

### Reallocation (Admin)

`PATCH /api/allocations/:allocationId/reallocate` with body `{ "targetRoomId": "..." }` moves a student to another room (under a MongoDB transaction) if:

- Target room has free capacity
- Compatibility with every existing occupant is >= moderate
- Occupant counts are updated atomically

On success:


If compatibility fails with any occupant, the reallocation is rejected (no partial updates thanks to the transaction).

### Transactional Safety

Auto-pairing during submission and reallocation operations run inside MongoDB transactions to avoid race conditions (e.g., two simultaneous submissions grabbing the last slots). Duplicate allocation attempts per session are guarded by a compound unique index (`student + session`).

### Uniqueness Constraint

`Allocation` schema defines `index({ student: 1, session: 1 }, { unique: true })`. Duplicate key errors are surfaced as validation errors with a clear message.

### Smarter Room Selection (Heuristic)

- Filters rooms with available capacity.
- Scores each by `(1 - occupied/capacity) + jitter` to prioritize rooms that keep capacity utilization balanced.
- Future improvements: cluster-compatible cohorts, gender-specific hostel filtering (pending gender field on `User`), fairness rotation.

### Future ML Enhancement Ideas

- Replace heuristic penalty with learned coefficients (e.g., logistic regression over “satisfied vs not”).
- Consider clustering to pre-group compatible cohorts before individual pairing.
- Introduce negative feedback loops (e.g., conflict reports) to decay certain trait weightings.

### Integration Notes

- Algorithm is pure & side-effect free (except for optional approval recording) → easy to test.
- Room capacity + hostel gender constraints are enforced separately (this module only ranks human compatibility).
- Add caching layer keyed by `traitSignature(user)` if performance becomes a concern at scale.
---

## 🧭 Roadmap Ideas
- Allocation algorithm (auto-assignment + fairness logic)
- Notifications/email integration
- Soft deletes & audit logs
- Admin dashboard metrics aggregation
- Test coverage (Jest + Supertest)
- CI pipeline & Docker containerization


### Overview

The test suite uses **Jest** with an **in-memory MongoDB replica set** (`MongoMemoryReplSet`) enabling:

- Transaction support (allocation submissions)
- Isolation (no local Mongo dependency)
- Deterministic cleanup (collections cleared after each test)

### Running Tests

```bash
npm test
```

Jest loads `tests/jest.setup.js` (bootstrap + replica set). Coverage enabled via `jest.config.mjs`.

### Structure

```text
tests/
  utils/testDb.js
  *.test.js
```

### Database Strategy
- Single-member replica set (WiredTiger)
- Truncate collections after each test
- Drop DB + stop server after all tests
- No real `MONGO_URI` required


1. Create `tests/exampleFeature.test.js`.
2. Import `app` and use `supertest`.
3. Seed with Mongoose models inline.
4. Assert on JSON responses.
```js
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';

test('creates a user', async () => {
  await User.create({ fullName: 'Test', email: 'ex@example.com', password: 'Pass1234!', role: 'student' });
  const res = await request(app).get('/api/students?limit=1');
  expect(res.status).toBe(200);
});
```

### Transaction Errors

If you see:

```text
Transaction numbers are only allowed on a replica set member or mongos
```

Replica set init was skipped—verify `jest.setup.js` executed.

### Transient Write Conflicts

Log lines `allocation.submit.retry` indicate a handled retry (code 112) — expected under parallel writes.

### Coverage

Improve by covering:

- Controller error paths
- Utility modules (caching, responses)
- Room selection and complaint edge cases

### Troubleshooting Table

| Symptom | Cause | Fix |
|---------|-------|-----|
| Duplicate tests | Stray file outside `tests/` | Remove/move file |
| Transaction error | Missing replica set | Ensure setup file runs |
| Hanging tests | Unawaited async / app.listen used | Remove listen, await promises |
| Flaky allocations | Transient conflicts | Retries already in place |
| Low coverage | Glob misses files | Adjust `collectCoverageFrom` |

### Performance / Load Tests

Place in `tests/perf/` and run explicitly:

```bash
npm test -- --testPathPattern=perf
```

---

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
