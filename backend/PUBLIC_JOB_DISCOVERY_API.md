# Public Job Discovery API Documentation

## Overview
The Public Job Discovery API enables frontend applications to fetch and search job listings without authentication. This API is designed for maximum performance, scalability, and user experience.

## Base URL
```
http://localhost:5001/api/v1/jobs
```

## Endpoints

### 1. GET /jobs
Fetch and search job listings with optional filters.

#### Request
```http
GET /jobs?page=1&limit=20&keyword=developer&type=full-time&location=San+Francisco&salary_min=100000&salary_max=150000&skills=typescript,react&exclude_applied=true
```

#### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number for pagination (must be ≥ 1) |
| `limit` | integer | 10 | 50 | Number of jobs per page |
| `keyword` | string | - | - | Search term for title and description (full-text search) |
| `type` | string | - | - | Job type filter: `full-time`, `part-time`, `contract`, `remote`, `internship` |
| `location` | string | - | - | Location filter (partial match, case-insensitive) |
| `salary_min` | integer | - | - | Minimum salary in USD (filters jobs with salary_min ≥ this value) |
| `salary_max` | integer | - | - | Maximum salary in USD (filters jobs with salary_max ≤ this value) |
| `skills` | string/array | - | - | Skills filter (comma-separated or array format). Returns jobs containing ALL specified skills |
| `exclude_applied` | boolean | false | - | For authenticated applicants only: exclude jobs already applied to |

#### Response Format

**Success (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Senior TypeScript Developer",
      "description": "We are looking for an experienced TypeScript developer...",
      "type": "full-time",
      "location": "San Francisco, CA",
      "salary_min": 120000,
      "salary_max": 160000,
      "skills": ["typescript", "react", "node.js"],
      "status": "active",
      "job_approval_status": "approved",
      "companyName": "Tech Corp",
      "company_logo": "https://example.com/logo.png",
      "company_website": "https://techcorp.com",
      "company_location": "San Francisco, CA",
      "views_count": 1234,
      "application_questions": [
        {
          "id": "q1",
          "label": "Tell us about your experience",
          "type": "textarea",
          "required": true
        }
      ],
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  },
  "message": "Jobs fetched successfully"
}
```

**Empty Results (200)**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "message": "Jobs fetched successfully"
}
```

**Error (400/422)**
```json
{
  "success": false,
  "message": "salary_max must be greater than or equal to salary_min"
}
```

#### Filtering Rules

1. **Keyword Search**: Uses PostgreSQL full-text search (plainto_tsquery). Searches in job title and description.
2. **Type**: Exact match. Accepts one of: `full-time`, `part-time`, `contract`, `remote`, `internship`
3. **Location**: Case-insensitive partial match (ILIKE)
4. **Salary Range**: 
   - `salary_min`: Returns jobs where job.salary_min ≥ filter value
   - `salary_max`: Returns jobs where job.salary_max ≤ filter value
   - Both parameters can be combined for range queries
5. **Skills**: Array/CSV. Returns jobs where job.skills contains ALL specified skills (array overlap)
6. **Exclude Applied**: For authenticated applicants only. Filters out jobs the user has already applied to.

#### Public Access Rules

- **Draft jobs**: Hidden from public (only visible to recruiter who owns them)
- **Unapproved jobs**: Hidden from public (require approval)
- **Deleted jobs**: Never visible
- **Deleted_at NULL**: Only non-deleted jobs are returned

#### Performance Considerations

- Optimized with database indexes on: `type`, `location`, `status`, `job_approval_status`, `skills` (GIN), `search_vector` (GIN)
- Pagination is limited to offset 10,000 to prevent DoS
- Salary range queries are indexed for fast filtering
- Full-text search uses PostgreSQL's built-in tsvector for efficiency

#### Examples

**Get first page of all active jobs**
```bash
curl "http://localhost:5001/api/v1/jobs?page=1&limit=20"
```

**Search for remote React positions with salary range**
```bash
curl "http://localhost:5001/api/v1/jobs?type=remote&keyword=react&salary_min=100000&salary_max=150000"
```

**Filter by multiple skills**
```bash
curl "http://localhost:5001/api/v1/jobs?skills=typescript,react,node.js"
```

**Exclude already applied jobs (requires auth)**
```bash
curl -H "Authorization: Bearer TOKEN" "http://localhost:5001/api/v1/jobs?exclude_applied=true"
```

---

### 2. GET /jobs/:id
Fetch detailed information about a specific job.

#### Request
```http
GET /jobs/550e8400-e29b-41d4-a716-446655440000
```

#### Response Format

**Success (200)**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Senior TypeScript Developer",
    "description": "We are looking for an experienced TypeScript developer with 5+ years of experience in building scalable applications. You will work with a team of talented engineers on our core platform.",
    "type": "full-time",
    "location": "San Francisco, CA",
    "salary_min": 120000,
    "salary_max": 160000,
    "skills": ["typescript", "react", "node.js", "postgresql", "docker"],
    "status": "active",
    "job_approval_status": "approved",
    "is_boosted": false,
    "views_count": 1234,
    "companyName": "Tech Corp",
    "company_logo": "https://example.com/logo.png",
    "company_website": "https://techcorp.com",
    "company_location": "San Francisco, CA",
    "is_external_company": false,
    "source": "recruiter",
    "external_url": null,
    "application_questions": [
      {
        "id": "q1",
        "label": "Tell us about your experience with TypeScript",
        "type": "textarea",
        "required": true,
        "placeholder": "Share your relevant experience..."
      },
      {
        "id": "q2",
        "label": "What is your preferred tech stack?",
        "type": "select",
        "required": false,
        "options": ["MERN", "MEAN", "LAMP", "Other"]
      }
    ],
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  },
  "message": "Job fetched successfully"
}
```

**Not Found (404)**
```json
{
  "success": false,
  "message": "Job not found"
}
```

**Invalid ID Format (400)**
```json
{
  "success": false,
  "message": "Job ID is required"
}
```

#### Features

- Full job details including complete description
- All company metadata (logo, website, location)
- Application questions with all formatting options
- View count tracking (incremented asynchronously)
- Company information from both job and recruiter profile (via COALESCE)

#### Visibility Rules

- **Draft jobs**: Only visible to the recruiter who created them
- **Unapproved jobs**: Only visible to approving admins (not public)
- **Deleted jobs**: Never visible

#### Examples

**Fetch job details**
```bash
curl "http://localhost:5001/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000"
```

---

## Error Handling

### Error Status Codes

| Code | Message | Cause |
|------|---------|-------|
| 200 | Success | Valid request |
| 400 | Bad Request | Invalid parameters or format |
| 404 | Not Found | Job doesn't exist or not accessible |
| 422 | Unprocessable Entity | Invalid data (e.g., salary_max < salary_min) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Scenarios

**Salary Range Error**
```json
{
  "success": false,
  "message": "salary_max must be greater than or equal to salary_min"
}
```

**Page Limit Exceeded**
```json
{
  "success": false,
  "message": "Page limit exceeded"
}
```

**Invalid Job Type**
```json
{
  "success": false,
  "message": "Invalid job type"
}
```

---

## Best Practices

### For Frontend Developers

1. **Pagination**: Always provide `page` and `limit` parameters to control response size
2. **Keyword Search**: Use for full-text search; leave empty for browse-all
3. **Filters**: Combine multiple filters for refined results
4. **Error Handling**: Handle 404 gracefully; redirect to job listing or show "Job no longer available"
5. **Caching**: Consider caching job list results with appropriate TTL (e.g., 5 minutes)

### For Performance

1. **Request Batching**: Fetch paginated results rather than individual job IDs
2. **Debouncing**: Debounce keyword search to reduce server load
3. **Lazy Loading**: Load additional pages as user scrolls
4. **Timeout**: Set reasonable request timeouts (e.g., 5-10 seconds)

### For Security

1. **Input Validation**: Validate all query parameters on client-side first
2. **XSS Prevention**: Sanitize job content before rendering (handled server-side)
3. **Rate Limiting**: Respect 429 responses and back off requests
4. **Authentication**: Use Bearer tokens for authenticated features

---

## Rate Limiting

- **Global limit**: 5000 requests/900 seconds per IP
- **Auth limit**: 200 requests/600 seconds for login attempts
- **Backoff**: When rate limited (429), wait before retrying

---

## Database Optimization

### Indexes

```sql
-- Full-text search index
CREATE INDEX idx_jobs_search ON jobs USING GIN (search_vector);

-- Skills array search
CREATE INDEX idx_jobs_skills ON jobs USING GIN (skills);

-- Type filtering
CREATE INDEX idx_jobs_type ON jobs(type);

-- Status and approval filtering
CREATE INDEX idx_jobs_approval_status ON jobs(job_approval_status);

-- Location search
CREATE INDEX idx_jobs_location ON jobs(location varchar_pattern_ops);

-- Combined discovery queries
CREATE INDEX idx_jobs_discovery ON jobs(job_approval_status, status, deleted_at, type);

-- Salary range queries
CREATE INDEX idx_jobs_salary_range ON jobs(salary_min, salary_max);
```

### Query Optimization

- Both GET endpoints use efficient query patterns
- COUNT and SELECT use identical WHERE clauses
- LEFT JOIN with recruiter_profiles for company data
- Parameterized queries prevent SQL injection

---

## Webhook / Event Tracking (Future)

- Job view tracking via `views_count` column
- Application events tracked in `applications` table
- Referral tracking via `referrals` table

---

## Changelog

### Version 1.0 (Current)
- Public job listing endpoint
- Advanced filtering by type, location, salary, skills
- Full-text keyword search
- Pagination with performance limits
- Job detail endpoint with full data
- Company metadata integration
- Application questions included in detail view
