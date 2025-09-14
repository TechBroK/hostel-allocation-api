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

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) |
| Security | Role-based middleware |
| Docs | swagger-ui-express + swagger-jsdoc |
| Uploads | multer (to local `uploads/`) |

---

## 🗂 Folder Structure

```text
src/
  app.js                # App bootstrap & route mounting
  createSuperAdmin.js   # Script to seed super-admin
  config/
    db.js               # Mongo connection
    swagger.js          # Swagger/OpenAPI spec setup
  controllers/          # (Business logic per resource)
  middleware/
    authMiddleware.js   # JWT protect middleware
    roleMiddleware.js   # Role-based access control
  models/               # Mongoose schemas
  routes/               # Express routers per resource
uploads/                 # Avatar uploads (local dev)
```

---

## 🔐 Roles Overview

| Role | Capabilities |
|------|--------------|
| student | Register/login, submit allocation, manage profile, upload avatar, submit complaints |
| admin | All student capabilities + manage hostels, rooms, allocations, view reports |
| super-admin | All admin capabilities + create new admin users |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```bash
MONGO_URI=mongodb://localhost:27017/hostel_allocation
JWT_SECRET=replace_with_a_strong_secret
PORT=8080
# Optional super-admin seeding values
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=SuperAdmin@123
SUPER_ADMIN_NAME=Super Admin
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run start
```
Server runs at: `http://localhost:${PORT || 8080}`

### 3. Seed Super Admin

Creates an initial `super-admin` (skips if one exists):

```bash
npm run create-super-admin
```

---

## 📘 API Documentation (Swagger)

Interactive docs: `http://localhost:8080/api-docs`
Use the "Authorize" button and paste: `Bearer <your_jwt_token>` after logging in.

---

## 🧪 Authentication Flow

1. `POST /api/auth/register` – create account (student by default)
2. `POST /api/auth/login` – receive `{ token, user }`
3. Include header for protected routes:

```text
Authorization: Bearer <token>
```

4. Super-admin OR existing admin creates another admin: `POST /api/admin/admins`

### Creating Admin Users

There are two ways administrators enter the system:

1. Initial super-admin (seed script) – has role `super-admin`.
2. Any existing `super-admin` or `admin` can create a new `admin` via the protected endpoint.

Endpoint:

```http
POST /api/admin/admins
Authorization: Bearer <token-of-super-admin-or-admin>
Content-Type: application/json
```

Request body fields (validated):

```json
{
  "fullName": "Jane Admin",
  "email": "jane.admin@example.com",
  "password": "StrongP@ssw0rd",
  "phone": "+2348012345678"
}
```

Sample curl (super-admin creating first admin):

```bash
curl -X POST http://localhost:8080/api/admin/admins \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Admin","email":"jane.admin@example.com","password":"StrongP@ssw0rd"}'
```

Sample curl (admin creating another admin):

```bash
curl -X POST http://localhost:8080/api/admin/admins \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Second Admin","email":"second.admin@example.com","password":"AnotherStr0ng!"}'
```

Expected 201 response:

```json
{ "id": "<mongoId>", "status": "admin created" }
```

Recommendation: Log/admin-audit each admin creation (who created whom + timestamp + IP) and consider adding rate limiting to this endpoint.

Error scenarios:

- 400 if email already exists
- 400 if required fields missing
- 401 if missing / invalid token
- 403 if caller is neither super-admin nor admin

To obtain the initial super-admin token:

1. Run the seed script `npm run create-super-admin` (if not already seeded).
2. Login with that email/password using `POST /api/auth/login`.
3. Use returned `token` for Authorization header above.

---

## 📦 Key Endpoints Summary

(See `/api-docs` for full details.)

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Students

- `GET /api/students/:studentId/profile`
- `PUT /api/students/:studentId/profile`
- `POST /api/students/:studentId/profile/avatar` (multipart)
- `GET /api/students/:studentId/roommate`

### Hostels & Rooms

- `GET /api/hostels`
- `GET /api/hostels/:hostelId/rooms`
- `POST /api/rooms/:hostelId/rooms` (admin)
- `GET /api/rooms/hostel/:hostelId`
- `GET /api/rooms/:id`

### Allocations

- `POST /api/allocations`
- `GET /api/allocations/:studentId/status`
- `GET /api/allocations` (admin)
- `POST /api/allocations/admin` (admin)

### Complaints

- `POST /api/complaints/:studentId`
- `GET /api/complaints/:studentId`

### Admin Utilities

- `POST /api/admin/admins` (super-admin or admin)
- `GET /api/admin/reports/summary` (admin)
- `GET /api/admin/reports/export` (admin)

---

## 🖼 File Upload (Avatar)

Endpoint: `POST /api/students/:studentId/profile/avatar`
Form field name: `avatar`
Content-Type: `multipart/form-data`
Stored temporarily in `uploads/`. For production, integrate a cloud provider (S3, Cloudinary, etc.) and persist file URLs.

---

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

---

## 🧰 Linting & Formatting

Project uses ESLint (flat config) + Prettier.

Scripts:

```bash
npm run lint      # analyze code
npm run lint:fix  # auto-fix where possible
```
Prettier settings in `.prettierrc` (width 90, double quotes, semicolons). Editor settings normalized by `.editorconfig`.

Recommended workflow before commit:

```bash
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

- Stateless auth using JWT
- Middleware composition: `protect` (auth) → `permit("role")` (authorization)
- Separation of concerns: routes (transport) vs controllers (logic)
- ES Modules enabled via `"type": "module"`

---

## 🔒 Security Recommendations (Next Steps)

- Rate limiting (e.g., `express-rate-limit`)
- Helmet for HTTP headers
- Password complexity validation
- Refresh token rotation strategy (if sessions needed)
- Central error handler middleware
- Audit logging (admin creations, failed logins)
- Enforce account lockout after repeated failed auth attempts

---

## 🧭 Roadmap Ideas

- Pagination for listings (hostels, rooms, allocations)
- Search & filtering (capacity, availability)
- Allocation algorithm (auto-assignment + fairness logic)
- Notifications/email integration
- Soft deletes & audit logs
- Admin dashboard metrics aggregation
- Test coverage (Jest + Supertest)
- CI pipeline & Docker containerization

---

## 🧪 Testing (Placeholder)

Suggested stack:

```text
Jest + Supertest
```

Run tests (after adding):

```bash
npm test
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
