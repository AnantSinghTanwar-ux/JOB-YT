import { EndpointCard } from '@/components/docs/EndpointCard';

export default function CalendarApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Calendar API</h1>
        <p className="text-slate-500 mt-1">Google Calendar integration for interview scheduling</p>
      </div>

      <EndpointCard
        method="GET"
        path="/api/v1/calendar/auth-url"
        description="Get the Google OAuth authorization URL to initiate calendar connection."
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  https://api.jobyt.in/api/v1/calendar/auth-url`}
        responseExample={`{
  "success": true,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "base64encodedstate"
  }
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/v1/calendar/callback"
        description="Exchange the OAuth authorization code for calendar tokens."
        params={[
          { name: 'code', type: 'string', required: true, description: 'OAuth authorization code from Google' },
          { name: 'state', type: 'string', required: true, description: 'State parameter from auth URL' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/calendar/callback \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"4/0AeaY...", "state":"base64..."}'`}
        responseExample={`{
  "success": true,
  "message": "Google Calendar connected successfully"
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/calendar/status"
        description="Check if Google Calendar is currently connected."
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  https://api.jobyt.in/api/v1/calendar/status`}
        responseExample={`{
  "success": true,
  "data": { "connected": true }
}`}
      />

      <EndpointCard
        method="DELETE"
        path="/api/v1/calendar/disconnect"
        description="Disconnect Google Calendar integration. Existing events are not affected."
        requestExample={`curl -X DELETE https://api.jobyt.in/api/v1/calendar/disconnect \\
  -H "X-API-Key: jobyt_your_key"`}
        responseExample={`{
  "success": true,
  "message": "Google Calendar disconnected"
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/v1/calendar/schedule-interview"
        description="Schedule an interview with Google Meet. Requires calendar to be connected."
        params={[
          { name: 'applicationId', type: 'UUID', required: true, description: 'Application to schedule interview for' },
          { name: 'scheduledAt', type: 'ISO datetime', required: true, description: 'Interview start time' },
          { name: 'durationMinutes', type: 'number', required: false, description: 'Interview duration (default 60)' },
          { name: 'notes', type: 'string', required: false, description: 'Additional notes' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/calendar/schedule-interview \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"applicationId":"550e...","scheduledAt":"2025-06-15T10:00:00Z"}'`}
        responseExample={`{
  "success": true,
  "data": {
    "calendar_event_id": "google_event_id",
    "meet_link": "https://meet.google.com/abc-defg-hij",
    "scheduled_at": "2025-06-15T10:00:00.000Z",
    "duration_minutes": 60
  }
}`}
      />
    </div>
  );
}
