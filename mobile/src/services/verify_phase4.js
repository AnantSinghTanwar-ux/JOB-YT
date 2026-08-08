const axios = require('axios');

const API_BASE = 'http://localhost:5001/api/v1';

async function runVerification() {
  console.log('=== STARTING PHASE 4 AI INTERVIEW API VERIFICATION ===');
  
  const testEmail = `test_interview_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword!@#123456';
  let accessToken = '';

  try {
    // 1. Test Registration
    console.log('\n[1] Registering test student...');
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Interview Candidate',
      email: testEmail,
      password: testPassword,
      role: 'applicant'
    });
    console.log('Register Success:', regRes.data.success);

    // Verify account in development mode using the dev verify endpoint
    console.log('\n[2] Verifying Email in Dev Mode...');
    const verifyRes = await axios.post(`${API_BASE}/auth/dev/verify`, {
      email: testEmail
    });
    console.log('Dev Verify Success:', verifyRes.data.success);

    // 3. Test Login
    console.log('\n[3] Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('Login Success:', loginRes.data.success);
    accessToken = loginRes.data.data.accessToken;

    const headers = { Authorization: `Bearer ${accessToken}` };

    // 4. Test Readiness BEFORE session
    console.log('\n[4] Fetching initial Readiness metrics...');
    const initReadiness = await axios.get(`${API_BASE}/interviews/readiness`, { headers });
    console.log('Initial Readiness current_score:', initReadiness.data.data.readiness?.current_score ?? 'None');
    console.log('Initial Readiness history count:', initReadiness.data.data.history?.length ?? 0);

    // 5. Create Session
    console.log('\n[5] Creating new Mock Interview session...');
    const sessionRes = await axios.post(`${API_BASE}/interviews/sessions`, {
      roleTitle: 'Software Engineer',
      jobDescription: 'Seeking developer with React, Node, and TypeScript skills.',
      questionCount: 3
    }, { headers });
    
    const session = sessionRes.data.data;
    console.log('Session Created. ID:', session.id, 'Status:', session.status);

    // 6. Get Session Details (Questions)
    console.log('\n[6] Fetching session details...');
    const detailsRes = await axios.get(`${API_BASE}/interviews/sessions/${session.id}`, { headers });
    const questions = detailsRes.data.data.questions || [];
    console.log('Fetched session details. Question count:', questions.length);
    if (questions.length === 0) {
      throw new Error('No questions generated for the mock session');
    }

    // 7. Submit responses to generated questions
    console.log('\n[7] Submitting answers to questions...');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`Submitting answer for Q${i+1} [${q.category}]: "${q.question_text}"`);
      const submitRes = await axios.post(`${API_BASE}/interviews/sessions/${session.id}/submit`, {
        questionId: q.id,
        responseText: `This is a comprehensive response to the question regarding ${q.category}. I have substantial experience using React, Node.js and TypeScript in production systems.`
      }, { headers });
      console.log(`Response Q${i+1} score evaluation: ${submitRes.data.data.score}/100. Feedback: "${submitRes.data.data.feedback}"`);
    }

    // 8. Complete session
    console.log('\n[8] Completing interview session...');
    const completeRes = await axios.post(`${API_BASE}/interviews/sessions/${session.id}/complete`, {}, { headers });
    console.log('Session complete success. Status is now:', completeRes.data.data.status);

    // 9. Fetch Session Report
    console.log('\n[9] Fetching performance report details...');
    const reportRes = await axios.get(`${API_BASE}/interviews/sessions/${session.id}/report`, { headers });
    const report = reportRes.data.data;
    console.log('Overall report score:', report.overall_score);
    console.log('Report summary text:', report.summary_text);
    console.log('Strengths parsed:', report.strengths);
    console.log('Weaknesses parsed:', report.weaknesses);
    console.log('Recommendations parsed:', report.recommendations);
    console.log('PDF URL available:', report.report_url || 'No URL generated (gracefully hidden)');

    // 10. List Sessions
    console.log('\n[10] Listing all user sessions...');
    const listRes = await axios.get(`${API_BASE}/interviews/sessions`, { headers });
    console.log('Session history count:', listRes.data.data.length);
    console.log('First listed session role:', listRes.data.data[0]?.role_title, 'Status:', listRes.data.data[0]?.status);

    // 11. Fetch Readiness AFTER session
    console.log('\n[11] Fetching updated Readiness metrics...');
    const updatedReadiness = await axios.get(`${API_BASE}/interviews/readiness`, { headers });
    console.log('Updated Readiness current_score:', updatedReadiness.data.data.readiness?.current_score);
    console.log('Updated Readiness trend:', updatedReadiness.data.data.readiness?.trend);
    console.log('Updated Readiness history count:', updatedReadiness.data.data.history?.length);

    console.log('\n=== E2E PHASE 4 API VERIFICATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('VERIFICATION FAILED:', err.response?.data || err.message);
    process.exit(1);
  }
}

runVerification();
