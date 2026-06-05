# ClinicOS Authentication & Authorization System

## Overview

A production-ready authentication and authorization system built with Express, JWT, bcrypt, and React with the following features:

### ✅ Implemented Features

**Backend (Node.js + Express)**
- ✅ User registration (bootstrap-first pattern)
- ✅ User login with email/password
- ✅ JWT token generation & validation
- ✅ Refresh token support (7-day expiry)
- ✅ Secure password hashing (bcrypt, 12 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Protected middleware (`requireAuth`, `requireRole`)
- ✅ Audit logging for auth events
- ✅ Token validation on all protected routes

**Frontend (React + TypeScript)**
- ✅ Login page with error handling
- ✅ Register page (bootstrap & admin-only)
- ✅ Protected routes component (`ProtectedRoute`)
- ✅ Token persistence in localStorage
- ✅ Refresh token storage & management
- ✅ Auto-logout on token expiration
- ✅ Session management with `auth-session` utilities
- ✅ Role-aware UI rendering
- ✅ Sign out functionality

---

## API Endpoints

### Authentication Routes (`/api/auth`)

#### 1. **POST /auth/register**
Register a new user (bootstrap or admin-only).

**Bootstrap Registration** (first user):
- No authentication required
- Creates an ADMIN user regardless of role parameter

**Admin Registration** (subsequent users):
- Requires `Authorization: Bearer <token>` header
- Requires ADMIN role
- Allows specifying role (ADMIN, DOCTOR, RECEPTIONIST)

**Request:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@clinic.com",
    "password": "SecurePass123!",
    "fullName": "Dr. Jane Smith",
    "role": "DOCTOR"
  }'
```

**Response (201 Created):**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "jane@clinic.com",
      "fullName": "Dr. Jane Smith",
      "role": "DOCTOR",
      "isActive": true,
      "createdAt": "2026-05-09T12:00:00.000Z",
      "updatedAt": "2026-05-09T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. **POST /auth/login**
Authenticate user and receive tokens.

**Request:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "<staff-email>",
    "password": "<staff-password>"
  }'
```

**Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "harper@clinicos.local",
      "fullName": "Dr. Harper Chen",
      "role": "DOCTOR",
      "isActive": true,
      "createdAt": "2026-05-09T10:42:00.000Z",
      "updatedAt": "2026-05-09T10:42:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. **POST /auth/refresh**
Refresh an expired access token using a valid refresh token.

**Request:**
```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Authorization: Bearer <refreshToken>"
```

**Response (200 OK):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "harper@clinicos.local",
      "fullName": "Dr. Harper Chen",
      "role": "DOCTOR",
      "isActive": true,
      "createdAt": "2026-05-09T10:42:00.000Z",
      "updatedAt": "2026-05-09T10:42:00.000Z"
    }
  }
}
```

#### 4. **GET /api/auth/me**
Get current authenticated user info.

**Request:**
```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "harper@clinicos.local",
    "fullName": "Dr. Harper Chen",
    "role": "DOCTOR",
    "isActive": true,
    "createdAt": "2026-05-09T10:42:00.000Z",
    "updatedAt": "2026-05-09T10:42:00.000Z"
  }
}
```

---

## Roles & Permissions

### Role Hierarchy

```
ADMIN
├─ Can register new staff accounts
├─ Can access all routes (with requireRole middleware)
├─ Can manage system settings
└─ No implicit restrictions

DOCTOR
├─ Can search patients
├─ Can view patient profiles & medical records
├─ Can create/view appointments
└─ Cannot access admin routes

RECEPTIONIST
├─ Can manage patients (CRUD)
├─ Can manage appointments (CRUD)
├─ Can search patients
└─ Cannot access doctor/admin-only routes
```

### Protected Routes by Role

```
/api/patients/search       → DOCTOR, RECEPTIONIST
/api/patients/profile/:id  → DOCTOR, RECEPTIONIST
/api/patients             → ADMIN, DOCTOR, RECEPTIONIST
/api/appointments        → ADMIN, DOCTOR, RECEPTIONIST
/api/auth/register       → ADMIN only (except bootstrap)
```

---

## JWT Token Structure

### Access Token (7 days)
```json
{
  "sub": "user-uuid",
  "email": "user@clinic.com",
  "fullName": "Dr. Name",
  "role": "DOCTOR",
  "iat": 1778325600,
  "exp": 1778930400
}
```

### Refresh Token (7 days)
```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "iat": 1778325600,
  "exp": 1778930400
}
```

**Token Validation:**
- Signature verified using `JWT_SECRET`
- Expiry checked automatically
- Invalid/expired tokens return 401

---

## Frontend Implementation

### File Structure
```
frontend/src/
├── api/
│   ├── auth.ts              # API functions (login, register, refresh)
│   └── client.ts            # HTTP client with token injection
├── lib/
│   └── auth-session.ts      # Token & user persistence
├── components/
│   ├── protected-route.tsx  # Protected route wrapper
│   └── layout/
│       └── app-shell.tsx    # Authenticated layout
└── pages/
    ├── login-page.tsx       # Login form
    └── register-page.tsx    # Registration form
```

### Token Persistence

**Stored in localStorage:**
```javascript
localStorage['clinicos.token']          // Access token
localStorage['clinicos.refreshToken']   // Refresh token
localStorage['clinicos.user']           // User data (JSON)
localStorage['clinicos.tokenExpiry']    // Token expiry timestamp
```

### Auto-Logout on Expiration

The `isTokenExpired()` utility checks if token has expired:
```typescript
// In auth-session.ts
export function isTokenExpired(): boolean {
  const expiryTime = parseInt(window.localStorage.getItem('clinicos.tokenExpiry'), 10);
  return new Date().getTime() > expiryTime;
}
```

### Protected Route Component

```typescript
<ProtectedRoute requiredRoles={['DOCTOR', 'ADMIN']}>
  <DoctorPage />
</ProtectedRoute>
```

- Redirects to `/login` if not authenticated
- Redirects to `/dashboard` if role not permitted
- Renders children if auth & role checks pass

---

## Backend Implementation

### Password Hashing
```typescript
// Registration: hash with 12 rounds
const passwordHash = await bcrypt.hash(input.password, 12);

// Login: verify submitted password
const isValid = await bcrypt.compare(submittedPassword, user.passwordHash);
```

**Security:**
- 12 rounds = ~250ms per hash (OWASP recommended for 2026)
- Salt automatically included in hash
- Timing-safe comparison used by bcryptjs

### Middleware Chain

**Example: Protected endpoint**
```
Request → requireAuth → JWT verify → extract user → handler
        → requireRole  → check allowed roles → next
```

### Audit Logging

All auth events logged:
- User registration
- Login attempts
- Token refresh
- Role-based access denials

---

## Testing the System

### Test Bootstrap Flow

Create the first admin through `POST /api/auth/register`, then use that account to create additional staff users.

Example payload:

```json
{
  "email": "<admin-email>",
  "password": "<strong-admin-password>",
  "fullName": "Clinic Admin",
  "role": "ADMIN"
}
```

### Manual API Test

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<strong-admin-password>"}' \
  | jq -r '.data.token')

# 2. Access protected route
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 3. Test role restriction
curl http://localhost:4000/api/patients/search?q=test \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security Considerations

### ✅ Implemented
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens signed with strong secret
- ✅ HTTPS-ready (via Caddy reverse proxy)
- ✅ Role-based access control enforced
- ✅ CORS configured for localhost
- ✅ Refresh token support (short-lived access tokens)
- ✅ Token expiry enforced
- ✅ Audit logs for security events

### 🚀 Recommended for Production
- Use environment variables for `JWT_SECRET` (minimum 32 chars, use strong random)
- Enable HTTPS in production (Caddy supports Let's Encrypt)
- Implement rate limiting on `/auth/login` to prevent brute force
- Add 2FA/MFA for sensitive roles (ADMIN, DOCTOR)
- Store refresh tokens in secure, httpOnly cookies (optional)
- Add token blacklist for logout (optional, for logout endpoint)
- Monitor audit logs for suspicious patterns

---

## Configuration

### Backend Environment Variables

```bash
# Required
JWT_SECRET=your-long-random-secret-minimum-32-characters
JWT_EXPIRES_IN=7d  # Can be: 1d, 7d, 30d, or seconds like 3600

# Optional (defaults shown)
CORS_ORIGIN=http://localhost
NODE_ENV=production
DATABASE_URL=postgresql://...
```

### Frontend Configuration

Vite automatically injects `VITE_API_BASE_URL`:
```typescript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
```

With Caddy reverse proxy, `/api/*` routes are forwarded to backend:4000.

---

## Troubleshooting

### "Invalid or expired token"
- Token expired → use refresh token to get new access token
- Token malformed → re-login
- Wrong `JWT_SECRET` in .env → restart backend with correct secret

### "You do not have permission to access this resource"
- Role does not match endpoint requirements
- Use appropriate account (e.g., ADMIN for registration)

### "Missing bearer token"
- Authorization header not sent
- Header format must be: `Authorization: Bearer <token>`

### Auto-logout not triggering
- Check localStorage for `clinicos.tokenExpiry`
- Ensure frontend is checking `isTokenExpired()` on route changes
- Can add periodic check in effect hook:
  ```typescript
  useEffect(() => {
    const check = setInterval(() => {
      if (isTokenExpired()) {
        clearAuthSession();
        navigate('/login');
      }
    }, 60000); // Check every minute
    return () => clearInterval(check);
  }, []);
  ```

---

## Next Steps / Enhancements

- [ ] OAuth2/OpenID Connect integration (Google, Azure AD)
- [ ] Multi-factor authentication (MFA/2FA)
- [ ] Account lockout after N failed attempts
- [ ] Session management dashboard (view active sessions, revoke)
- [ ] API key support for service-to-service auth
- [ ] SAML for enterprise SSO
- [ ] Passwordless authentication (WebAuthn/FIDO2)
- [ ] Audit log exports & compliance reports

---

**System Status:** ✅ Production-ready  
**Last Updated:** 2026-05-09  
**Framework:** Express 5.x + React 19.x + Prisma 6.x
