import { EndpointCard } from '@/components/docs/EndpointCard';

export default function ApiKeysApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">API Keys API</h1>
        <p className="text-slate-500 mt-1">Manage your API keys programmatically</p>
      </div>

      <EndpointCard
        method="POST"
        path="/api/v1/api-keys"
        description="Create a new API key. The raw key is returned only once."
        params={[
          { name: 'name', type: 'string', required: true, description: 'Descriptive name for this key' },
          { name: 'scopes', type: 'string[]', required: true, description: 'Permission scopes for this key' },
          { name: 'permissions', type: 'object', required: false, description: 'Fine-grained permissions' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/api-keys \\
  -H "X-API-Key: jobyt_existing_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"CI/CD Pipeline","scopes":["read:jobs","write:applications"]}'`}
        responseExample={`{
  "success": true,
  "message": "API key created. Save this key now — it will not be shown again.",
  "data": {
    "id": "uuid",
    "key_prefix": "jobyt_a1",
    "name": "CI/CD Pipeline",
    "scopes": ["read:jobs", "write:applications"],
    "api_key": "jobyt_a1b2c3d4e5f6..."
  }
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/api-keys"
        description="List all API keys for the authenticated user. The raw key is never returned."
        requestExample={`curl -H "X-API-Key: jobyt_existing_key" \\
  https://api.jobyt.in/api/v1/api-keys`}
        responseExample={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "key_prefix": "jobyt_a1",
      "name": "CI/CD Pipeline",
      "scopes": ["read:jobs", "write:applications"],
      "created_at": "2025-06-01T10:00:00Z"
    }
  ]
}`}
      />

      <EndpointCard
        method="PATCH"
        path="/api/v1/api-keys/:id"
        description="Update an API key's name or scopes."
        params={[
          { name: 'id', type: 'UUID', required: true, description: 'API key ID' },
          { name: 'name', type: 'string', required: false, description: 'New descriptive name' },
          { name: 'scopes', type: 'string[]', required: false, description: 'Updated scope list' },
        ]}
        requestExample={`curl -X PATCH https://api.jobyt.in/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000 \\
  -H "X-API-Key: jobyt_existing_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Updated Pipeline Key"}'`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "key_prefix": "jobyt_a1",
    "name": "Updated Pipeline Key",
    "scopes": ["read:jobs", "write:applications"],
    "updated_at": "2025-06-02T10:00:00Z"
  }
}`}
      />

      <EndpointCard
        method="DELETE"
        path="/api/v1/api-keys/:id"
        description="Revoke an API key. It will stop working immediately."
        requestExample={`curl -X DELETE https://api.jobyt.in/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000 \\
  -H "X-API-Key: jobyt_existing_key"`}
        responseExample={`{
  "success": true,
  "message": "API key revoked successfully"
}`}
      />
    </div>
  );
}
