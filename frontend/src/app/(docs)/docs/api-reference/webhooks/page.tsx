import { EndpointCard } from '@/components/docs/EndpointCard';

export default function WebhookApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Webhooks API</h1>
        <p className="text-slate-500 mt-1">Register and manage webhook subscriptions</p>
      </div>

      <EndpointCard
        method="POST"
        path="/api/v1/webhooks"
        description="Register a new webhook endpoint to receive event notifications."
        params={[
          { name: 'url', type: 'string', required: true, description: 'HTTPS URL to receive POST requests' },
          { name: 'events', type: 'string[]', required: true, description: 'Event types to subscribe to' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/webhooks \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://myapp.com/hooks/jobyt","events":["application.submitted","application.status_changed"]}'`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://myapp.com/hooks/jobyt",
    "events": ["application.submitted", "application.status_changed"],
    "secret": "a1b2c3...",
    "is_active": true
  }
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/webhooks"
        description="List all registered webhooks with delivery counts."
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  https://api.jobyt.in/api/v1/webhooks`}
        responseExample={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "url": "https://myapp.com/hooks/jobyt",
      "events": ["application.submitted"],
      "is_active": true
    }
  ]
}`}
      />

      <EndpointCard
        method="PATCH"
        path="/api/v1/webhooks/:id"
        description="Update a webhook URL, event subscriptions, or active status."
        params={[
          { name: 'id', type: 'UUID', required: true, description: 'Webhook ID' },
          { name: 'url', type: 'string', required: false, description: 'New endpoint URL' },
          { name: 'events', type: 'string[]', required: false, description: 'Updated event list' },
          { name: 'is_active', type: 'boolean', required: false, description: 'Enable or pause webhook' },
        ]}
        requestExample={`curl -X PATCH https://api.jobyt.in/api/v1/webhooks/550e8400... \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"is_active":false}'`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "550e8400...",
    "url": "https://myapp.com/hooks/jobyt",
    "is_active": false
  }
}`}
      />

      <EndpointCard
        method="DELETE"
        path="/api/v1/webhooks/:id"
        description="Delete a webhook permanently."
        requestExample={`curl -X DELETE https://api.jobyt.in/api/v1/webhooks/550e8400... \\
  -H "X-API-Key: jobyt_your_key"`}
        responseExample={`{
  "success": true,
  "message": "Webhook deleted"
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/webhooks/:id/deliveries"
        description="Get recent delivery logs for a webhook."
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  https://api.jobyt.in/api/v1/webhooks/550e8400.../deliveries`}
        responseExample={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event_type": "application.submitted",
      "response_status": 200,
      "attempt": 1,
      "delivered_at": "2025-06-01T10:00:05Z"
    }
  ]
}`}
      />
    </div>
  );
}
