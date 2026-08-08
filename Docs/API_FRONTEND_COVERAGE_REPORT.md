# API and Frontend Integration Coverage Report

## Scope
- Backend source of truth: backend/src/routes/index.ts and backend/src/routes/*.ts
- Frontend source of truth: frontend/src/app/**/page.tsx, frontend/src/hooks/*.ts, frontend/src/components/**/*.tsx, frontend/src/store/auth.store.ts, frontend/src/lib/api/roadmaps.api.ts
- Base API path assumed by frontend: /api/v1

## Summary
- Total backend endpoints (including health, webhook, and dev-only helper): 100
- Integrated in frontend: 57
- Not integrated in frontend usage: 43
- Frontend pages discovered: 32
- Frontend pages with no real backend integration (mock/static only): 2
- Actionable left-to-integrate endpoints in this report: 41 (excludes backend-only webhook, but includes dev-only helper)

## Backend API Inventory With Integration Status

### Health
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /health | Not Integrated | - |

### Auth (/auth)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| POST | /auth/register | Integrated | /(auth)/register |
| GET | /auth/verify-email | Integrated | /(auth)/verify-email |
| POST | /auth/verify-email | Not Integrated | - |
| POST | /auth/login | Integrated | /(auth)/login via auth store |
| POST | /auth/google | Not Integrated | - |
| POST | /auth/github | Not Integrated | - |
| POST | /auth/linkedin | Not Integrated | - |
| POST | /auth/refresh-token | Not Integrated | - |
| POST | /auth/forgot-password | Integrated | /(auth)/forgot-password |
| POST | /auth/reset-password | Integrated | /(auth)/reset-password |
| GET | /auth/me | Not Integrated | - |
| POST | /auth/add-email | Not Integrated | - |
| POST | /auth/resend-verification | Not Integrated | - |
| POST | /auth/dev/verify (non-production only) | Not Integrated | - |

### Users (/users)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /users/me | Integrated | /(dashboard)/profile, /(dashboard)/jobs/[id] |
| PUT | /users/me | Integrated | /(dashboard)/profile |
| POST | /users/me/resume | Not Integrated | - |
| POST | /users/me/resume-parse | Not Integrated | - |
| POST | /users/me/photo | Integrated | /(dashboard)/profile |
| GET | /users/me/resumes | Not Integrated | - |
| GET | /users/me/resumes/default | Not Integrated | - |
| PATCH | /users/me/resumes/:id/set-default | Not Integrated | - |
| DELETE | /users/me/resumes/:id | Not Integrated | - |
| POST | /users/me/resume-score | Integrated | /(dashboard)/jobs/[id] |
| GET | /users/me/saved-jobs | Integrated | /(dashboard)/dashboard, /(dashboard)/saved-jobs |
| POST | /users/me/saved-jobs/:jobId | Integrated | /(dashboard)/jobs/[id] |
| DELETE | /users/me/saved-jobs/:jobId | Integrated | /(dashboard)/jobs/[id], /(dashboard)/saved-jobs |
| GET | /users/:userId/roadmaps/:roadmapId/progress | Integrated | /(dashboard)/roadmaps/[slug] via RoadmapApi |
| GET | /users/:userId/roadmaps/:roadmapId/recommend-next-skill | Integrated | /(dashboard)/roadmaps/[slug] via RoadmapApi |
| GET | /users/:userId | Not Integrated | - |

### Jobs (/jobs)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /jobs | Integrated | /, /internships, /(dashboard)/dashboard, /(dashboard)/jobs |
| GET | /jobs/:id | Integrated | /(dashboard)/jobs/[id], /(recruiter)/recruiter/jobs/[id] |
| POST | /jobs/match | Integrated | /(dashboard)/jobs/[id] |
| POST | /jobs/skill-gap | Integrated | /(dashboard)/jobs/[id] |
| POST | /jobs/interview-questions | Integrated | /(recruiter)/recruiter/jobs/[id] |
| PATCH | /jobs/:id/close | Not Integrated | - |
| GET | /jobs/my/listings | Integrated | /(recruiter)/recruiter/dashboard, /(recruiter)/recruiter/jobs |
| POST | /jobs | Integrated | /(recruiter)/recruiter/jobs/new |
| PUT | /jobs/:id | Integrated | /(recruiter)/recruiter/jobs/[id] |
| PATCH | /jobs/:id/publish | Integrated | /(recruiter)/recruiter/jobs, /(recruiter)/recruiter/jobs/[id] |
| DELETE | /jobs/:id | Integrated | /(recruiter)/recruiter/jobs |

### Applications (/applications)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /applications/my | Integrated | /(dashboard)/applications via useApplications |
| GET | /applications/my/filtered | Not Integrated | - |
| GET | /applications/my/stats | Not Integrated | - |
| GET | /applications/recruiter/applicants | Not Integrated | - |
| GET | /applications/recruiter/applicants/filtered | Not Integrated | - |
| GET | /applications/recruiter/applicants/stats | Not Integrated | - |
| GET | /applications/jobs/:jobId/check | Integrated | /(dashboard)/jobs/[id] |
| POST | /applications/jobs/:jobId | Integrated | /(dashboard)/jobs/[id] |
| GET | /applications/jobs/:jobId | Integrated | /(recruiter)/recruiter/jobs/[id]/applications via useApplications |
| PATCH | /applications/:id/status | Integrated | /(recruiter)/recruiter/jobs/[id]/applications via useApplications |
| GET | /applications/:id/events | Integrated | /(recruiter)/recruiter/jobs/[id]/applications via ApplicationTimeline |

### Credits (/credits)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /credits/balance | Integrated | /(dashboard)/dashboard, /(dashboard)/credits, /(recruiter)/recruiter/dashboard, /(recruiter)/recruiter/credits |
| GET | /credits/ledger | Not Integrated | - |
| GET | /credits/history | Integrated | /(dashboard)/credits, /(recruiter)/recruiter/credits |

### Notifications (/notifications)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /notifications | Integrated | /(dashboard)/notifications via useNotifications |
| PATCH | /notifications/:id/read | Integrated | /(dashboard)/notifications via useNotifications |
| PATCH | /notifications/read-all | Integrated | /(dashboard)/notifications via useNotifications |

### Messages (/messages)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /messages/conversations | Not Integrated | - |
| POST | /messages/conversations | Not Integrated | - |
| GET | /messages/conversations/:conversationId | Integrated | /(dashboard)/messages/[conversationId] |
| POST | /messages/conversations/:conversationId | Integrated | /(dashboard)/messages/[conversationId] |

### Payments (/payments)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /payments/plans | Integrated | /(dashboard)/credits, /(recruiter)/recruiter/credits |
| POST | /payments/webhook/stripe | Not Integrated (backend webhook) | Stripe only |
| POST | /payments/checkout | Integrated | /(dashboard)/credits, /(recruiter)/recruiter/credits |
| GET | /payments/history | Not Integrated | - |

### Referrals (/referrals)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /referrals/dashboard | Integrated | /(dashboard)/referral |

### Admin (/admin)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /admin/users | Integrated | /(admin)/admin/users |
| GET | /admin/users/:id | Not Integrated | - |
| PATCH | /admin/users/:id/ban | Integrated | /(admin)/admin/users |
| PATCH | /admin/users/:id/unban | Integrated | /(admin)/admin/users |
| DELETE | /admin/users/:id | Integrated | /(admin)/admin/users |
| GET | /admin/jobs | Integrated | /(admin)/admin/jobs |
| PATCH | /admin/jobs/:id/close | Integrated | /(admin)/admin/jobs |
| PATCH | /admin/jobs/:id/approve | Not Integrated | - |
| DELETE | /admin/jobs/:id | Integrated | /(admin)/admin/jobs |
| GET | /admin/credits | Integrated | /(admin)/admin/credits |
| POST | /admin/credits/:id/adjust | Integrated | /(admin)/admin/credits |
| PATCH | /admin/recruiter/:id/verify | Not Integrated | - |
| GET | /admin/metrics | Integrated | /(admin)/admin/dashboard |
| GET | /admin/audit-log | Not Integrated | - |

### Analytics (/analytics)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /analytics/summary | Integrated | /(recruiter)/recruiter/dashboard, /(recruiter)/recruiter/analytics |
| GET | /analytics/applications-by-day | Integrated | /(recruiter)/recruiter/analytics |
| GET | /analytics/time-to-hire | Not Integrated | - |
| GET | /analytics/credit-usage | Integrated | /(recruiter)/recruiter/analytics |
| GET | /analytics/jobs/:jobId/funnel | Not Integrated | - |
| GET | /analytics/jobs/:jobId/views | Not Integrated | - |

### Pipeline (/pipeline)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /pipeline/board/:jobId | Integrated | /(recruiter)/recruiter/jobs/[id]/applications via PipelineBoard |
| PATCH | /pipeline/move-stage | Integrated | /(recruiter)/recruiter/jobs/[id]/applications via PipelineBoard |
| GET | /pipeline/history/:candidateId/:jobId | Not Integrated | - |

### Recruiter (/recruiter)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| GET | /recruiter/profile | Not Integrated | - |
| PUT | /recruiter/profile | Not Integrated | - |
| POST | /recruiter/profile | Not Integrated | - |

### Roadmaps (/roadmaps)
| Method | Path | Frontend Status | Used By |
|---|---|---|---|
| POST | /roadmaps/ingest | Not Integrated | - |
| GET | /roadmaps/ingestion/:id | Not Integrated | - |
| POST | /roadmaps/generate | Integrated | /(dashboard)/jobs/[id] |
| GET | /roadmaps | Integrated | /(dashboard)/roadmaps |
| GET | /roadmaps/:id | Not Integrated | - |
| GET | /roadmaps/:id/nodes | Integrated | /(dashboard)/roadmaps/[slug] |

## Frontend Page Coverage (All 32 Pages)

| Page | Integration | Backend Endpoints Used |
|---|---|---|
| / | Integrated (indirect) | GET /jobs (via landing JobCards component) |
| /internships | Integrated | GET /jobs |
| /(auth)/login | Integrated (indirect) | POST /auth/login (via auth store) |
| /(auth)/register | Integrated | POST /auth/register |
| /(auth)/verify-email | Integrated | GET /auth/verify-email |
| /(auth)/forgot-password | Integrated | POST /auth/forgot-password |
| /(auth)/reset-password | Integrated | POST /auth/reset-password |
| /(dashboard)/dashboard | Integrated | GET /credits/balance, GET /applications/my, GET /users/me/saved-jobs, GET /jobs |
| /(dashboard)/profile | Integrated | GET /users/me, PUT /users/me, POST /users/me/photo |
| /(dashboard)/jobs | Integrated (indirect) | GET /jobs (via useJobs) |
| /(dashboard)/jobs/[id] | Integrated | GET /jobs/:id, GET /applications/jobs/:jobId/check, GET /users/me, POST /jobs/match, POST /jobs/skill-gap, POST /applications/jobs/:jobId, POST/DELETE /users/me/saved-jobs/:jobId, POST /roadmaps/generate, POST /users/me/resume-score |
| /(dashboard)/applications | Integrated (indirect) | GET /applications/my (via useApplications) |
| /(dashboard)/saved-jobs | Integrated | GET /users/me/saved-jobs, DELETE /users/me/saved-jobs/:jobId |
| /(dashboard)/credits | Integrated | GET /credits/balance, GET /credits/history, GET /payments/plans, POST /payments/checkout |
| /(dashboard)/credits/earn | Not Integrated (static/mock) | - |
| /(dashboard)/roadmaps | Integrated | GET /roadmaps |
| /(dashboard)/roadmaps/[slug] | Integrated | GET /roadmaps/:id/nodes, GET /users/:userId/roadmaps/:roadmapId/progress, GET /users/:userId/roadmaps/:roadmapId/recommend-next-skill |
| /(dashboard)/messages | Not Integrated (mock UI) | - |
| /(dashboard)/messages/[conversationId] | Integrated | GET /messages/conversations/:conversationId, POST /messages/conversations/:conversationId |
| /(dashboard)/notifications | Integrated (indirect) | GET /notifications, PATCH /notifications/:id/read, PATCH /notifications/read-all |
| /(dashboard)/referral | Integrated | GET /referrals/dashboard |
| /(recruiter)/recruiter/dashboard | Integrated | GET /credits/balance, GET /analytics/summary, GET /jobs/my/listings |
| /(recruiter)/recruiter/jobs | Integrated | GET /jobs/my/listings, DELETE /jobs/:id, PATCH /jobs/:id/publish |
| /(recruiter)/recruiter/jobs/new | Integrated | POST /jobs |
| /(recruiter)/recruiter/jobs/[id] | Integrated | GET /jobs/:id, PUT /jobs/:id, PATCH /jobs/:id/publish, POST /jobs/interview-questions |
| /(recruiter)/recruiter/jobs/[id]/applications | Integrated | GET /applications/jobs/:jobId, PATCH /applications/:id/status, GET /applications/:id/events, GET /pipeline/board/:jobId, PATCH /pipeline/move-stage |
| /(recruiter)/recruiter/analytics | Integrated | GET /analytics/summary, GET /analytics/applications-by-day, GET /analytics/credit-usage |
| /(recruiter)/recruiter/credits | Integrated | GET /credits/balance, GET /credits/history, GET /payments/plans, POST /payments/checkout |
| /(admin)/admin/dashboard | Integrated | GET /admin/metrics |
| /(admin)/admin/users | Integrated | GET /admin/users, PATCH /admin/users/:id/ban, PATCH /admin/users/:id/unban, DELETE /admin/users/:id |
| /(admin)/admin/jobs | Integrated | GET /admin/jobs, PATCH /admin/jobs/:id/close, DELETE /admin/jobs/:id |
| /(admin)/admin/credits | Integrated | GET /admin/credits, POST /admin/credits/:id/adjust |

## Endpoints Left To Integrate (Backend Exists, No Frontend Call)

1. GET /health
2. POST /auth/verify-email
3. POST /auth/google
4. POST /auth/github
5. POST /auth/linkedin
6. POST /auth/refresh-token
7. GET /auth/me
8. POST /auth/add-email
9. POST /auth/resend-verification
10. POST /auth/dev/verify (dev-only)
11. POST /users/me/resume
12. POST /users/me/resume-parse
13. GET /users/me/resumes
14. GET /users/me/resumes/default
15. PATCH /users/me/resumes/:id/set-default
16. DELETE /users/me/resumes/:id
17. GET /users/:userId
18. PATCH /jobs/:id/close
19. GET /applications/my/filtered
20. GET /applications/my/stats
21. GET /applications/recruiter/applicants
22. GET /applications/recruiter/applicants/filtered
23. GET /applications/recruiter/applicants/stats
24. GET /credits/ledger
25. GET /messages/conversations
26. POST /messages/conversations
27. GET /payments/history
28. GET /admin/users/:id
29. PATCH /admin/jobs/:id/approve
30. PATCH /admin/recruiter/:id/verify
31. GET /admin/audit-log
32. GET /analytics/time-to-hire
33. GET /analytics/jobs/:jobId/funnel
34. GET /analytics/jobs/:jobId/views
35. GET /pipeline/history/:candidateId/:jobId
36. GET /recruiter/profile
37. PUT /recruiter/profile
38. POST /recruiter/profile
39. POST /roadmaps/ingest
40. GET /roadmaps/ingestion/:id
41. GET /roadmaps/:id

## Notes and Caveats
- /(dashboard)/messages is currently a mock/static inbox UI and does not fetch real conversations.
- Login page shows social provider buttons but does not call OAuth endpoints yet.
- Roadmap detail page uses slug in frontend while backend route is /roadmaps/:id; this works only if controller supports slug lookup.
- POST /payments/webhook/stripe is intentionally backend-to-backend and should not be called from frontend.
