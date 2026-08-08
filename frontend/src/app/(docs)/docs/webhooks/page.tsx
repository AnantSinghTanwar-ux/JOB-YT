import { CodeBlock } from '@/components/docs/CodeBlock';

export default function WebhooksGuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Webhooks Guide</h1>
        <p className="text-slate-500 mt-1">Receive real-time event notifications from Jobyt</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
        <p className="text-slate-600 leading-relaxed">
          Webhooks let you subscribe to platform events and receive HTTP POST notifications to your server
          in real time. When an event fires, Jobyt delivers a signed JSON payload to your registered endpoint URL.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Event Types</h2>
        <div className="space-y-3">
          {[
            { event: 'application.submitted', desc: 'A new application has been submitted for a job' },
            { event: 'application.status_changed', desc: 'An application moved to a new pipeline stage' },
            { event: 'application.interview_completed', desc: 'An interview has been scheduled with Google Meet' },
            { event: 'application.offer_extended', desc: 'An offer has been extended to a candidate' },
            { event: 'user.registered', desc: 'A new user has registered on the platform' },
          ].map((e) => (
            <div key={e.event} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <code className="text-sm font-mono text-lime-700 font-semibold">{e.event}</code>
              <p className="text-slate-600 text-sm mt-1">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Delivery Headers</h2>
        <p className="text-slate-600">Each webhook POST includes these headers:</p>
        <CodeBlock
          language="http"
          code={`X-Jobyt-Event: application.submitted
X-Jobyt-Signature: t=1718366400,v1=a1b2c3d4e5f6...
X-Jobyt-Delivery: delivery-uuid
Content-Type: application/json
User-Agent: Jobyt-Webhook/1.0`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Verifying Signatures</h2>
        <p className="text-slate-600">
          The <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">X-Jobyt-Signature</code> header
          contains an HMAC-SHA256 signature of the payload. Verify it using your webhook secret:
        </p>

        <h3 className="text-sm font-semibold text-slate-700">JavaScript (Express)</h3>
        <CodeBlock
          language="javascript"
          code={`const crypto = require('crypto');

app.post('/webhooks/jobyt', (req, res) => {
  const signature = req.headers['x-jobyt-signature'];
  const [t, v1] = signature.split(',').map(s => s.split('=')[1]);

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.JOBYT_WEBHOOK_SECRET)
    .update(\`\${t}.\${body}\`)
    .digest('hex');

  if (v1 !== expected) {
    return res.status(401).send('Invalid signature');
  }

  // Process the event
  console.log('Event:', req.body.event);
  res.status(200).send('OK');
});`}
        />

        <h3 className="text-sm font-semibold text-slate-700">Python (Flask)</h3>
        <CodeBlock
          language="python"
          code={`import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)
SECRET = b'your_webhook_secret'

@app.route('/webhooks/jobyt', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Jobyt-Signature', '')
    t, v1 = [s.split('=')[1] for s in signature.split(',')]

    body = request.get_data(as_text=True)
    expected = hmac.new(
        SECRET,
        f'{t}.{body}'.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(v1, expected):
        return 'Invalid signature', 401

    print('Event:', request.json['event'])
    return 'OK', 200`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Retry Behavior</h2>
        <p className="text-slate-600">
          If your endpoint returns a non-2xx status or times out (10 second timeout), Jobyt retries
          the delivery up to 4 times with exponential backoff:
        </p>
        <CodeBlock
          language="text"
          code={`Attempt 1: immediate
Attempt 2: +1 second
Attempt 3: +2 seconds
Attempt 4: +4 seconds
After 4th failure → permanently failed`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Example Payloads</h2>

        <h3 className="text-sm font-semibold text-slate-700">application.submitted</h3>
        <CodeBlock
          language="json"
          code={`{
  "event": "application.submitted",
  "application_id": "uuid",
  "job_id": "uuid",
  "job_title": "Senior Developer",
  "applicant": { "id": "uuid", "name": "Jane", "email": "jane@example.com" },
  "timestamp": "2025-06-01T10:00:00.000Z"
}`}
        />

        <h3 className="text-sm font-semibold text-slate-700">application.status_changed</h3>
        <CodeBlock
          language="json"
          code={`{
  "event": "application.status_changed",
  "application_id": "uuid",
  "job_id": "uuid",
  "job_title": "Senior Developer",
  "old_status": "in_review",
  "new_status": "interview",
  "changed_by": "recruiter-uuid",
  "timestamp": "2025-06-01T12:00:00.000Z"
}`}
        />

        <h3 className="text-sm font-semibold text-slate-700">user.registered</h3>
        <CodeBlock
          language="json"
          code={`{
  "event": "user.registered",
  "user_id": "uuid",
  "email": "newuser@example.com",
  "role": "applicant",
  "auth_provider": "local",
  "timestamp": "2025-06-01T10:00:00.000Z"
}`}
        />
      </section>
    </div>
  );
}
