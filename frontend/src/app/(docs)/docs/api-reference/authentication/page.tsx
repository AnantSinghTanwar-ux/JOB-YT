import { EndpointCard } from '@/components/docs/EndpointCard';

export default function AuthApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Authentication API</h1>
        <p className="text-slate-500 mt-1">API key and JWT-based authentication endpoints</p>
      </div>

      <EndpointCard
        method="POST"
        path="/api/v1/auth/login"
        description="Authenticate with email and password to obtain a JWT access token and refresh token."
        params={[
          { name: 'email', type: 'string', required: true, description: 'User email address' },
          { name: 'password', type: 'string', required: true, description: 'User password' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"yourpassword"}'`}
        responseExample={`{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "user": { "id": "uuid", "email": "user@example.com", "role": "applicant" }
  }
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/v1/auth/register"
        description="Register a new user account."
        params={[
          { name: 'email', type: 'string', required: true, description: 'User email address' },
          { name: 'password', type: 'string', required: true, description: 'Password (min 8 chars, upper+lower+number)' },
          { name: 'role', type: 'string', required: true, description: 'applicant or recruiter' },
          { name: 'referralCode', type: 'string', required: false, description: 'Referral code from another user' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"new@example.com","password":"SecurePass1","role":"applicant"}'`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "new@example.com",
    "role": "applicant",
    "emailVerificationRequired": false
  }
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/v1/auth/refresh-token"
        description="Refresh an expired access token using a valid refresh token."
        params={[
          { name: 'refreshToken', type: 'string', required: true, description: 'Valid refresh token' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/auth/refresh-token \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken":"eyJhbG..."}'`}
        responseExample={`{
  "success": true,
  "data": {
    "accessToken": "eyJhbG..."
  }
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/auth/me"
        description="Get the currently authenticated user's profile."
        requestExample={`curl -H "Authorization: Bearer eyJhbG..." \\
  https://api.jobyt.in/api/v1/auth/me`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "applicant"
  }
}`}
      />
    </div>
  );
}
