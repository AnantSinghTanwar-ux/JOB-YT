import sys
import re

content = open('backend/prisma/schema.prisma').read()

# 1. Conflict 1
content = content.replace(
'''<<<<<<< HEAD
  submission_source         String                @default("manual") @db.VarChar(30)
  insights_approved         Boolean               @default(false)
  insights_approved_at      DateTime?             @db.Timestamptz(6)
  insights_generated_at     DateTime?             @db.Timestamptz(6)
=======
  rank                      Int?
  percentile                Float?
  ai_recommended            Boolean?              @default(false)
  screening_score           Float?
  scoring_breakdown         Json?
>>>>>>> 599f85913b8ba825c5e1bf3d90f5cd0c045dd275''',
'''  submission_source         String                @default("manual") @db.VarChar(30)
  insights_approved         Boolean               @default(false)
  insights_approved_at      DateTime?             @db.Timestamptz(6)
  insights_generated_at     DateTime?             @db.Timestamptz(6)
  rank                      Int?
  percentile                Float?
  ai_recommended            Boolean?              @default(false)
  screening_score           Float?
  scoring_breakdown         Json?''')

# 2. Conflict 2
content = content.replace(
'''<<<<<<< HEAD
  interview_invites         interview_invites[]
  pipeline_events           pipeline_events[]
=======
  video_interviews          video_interviews[]
  interviews                interviews[]
  screening_audits          screening_audits[]
>>>>>>> 599f85913b8ba825c5e1bf3d90f5cd0c045dd275''',
'''  interview_invites         interview_invites[]
  pipeline_events           pipeline_events[]
  video_interviews          video_interviews[]
  interviews                interviews[]
  screening_audits          screening_audits[]''')

# 3. Conflict 3
content = content.replace(
'''<<<<<<< HEAD
  external_url                 String?                  @db.VarChar(2048)
=======
  structured_jd                Json?
>>>>>>> 599f85913b8ba825c5e1bf3d90f5cd0c045dd275''',
'''  external_url                 String?                  @db.VarChar(2048)
  structured_jd                Json?''')

# 4. Conflict 4
content = content.replace(
'''<<<<<<< HEAD
  auto_apply_events            auto_apply_events[]
  auto_apply_queue_items       auto_apply_queue_items[]
  broadcast_messages           broadcast_messages[]
  coding_assessments_on_job    coding_assessments[]     @relation("AssessmentJob")
  conversations                conversations[]
  job_recommendations          job_recommendations[]
  active_assessment_version    assessment_versions?     @relation("JobActiveAssessmentVersion", fields: [active_assessment_version_id], references: [id], onUpdate: NoAction)
  linked_coding_assessment     coding_assessments?      @relation("JobLinkedAssessment", fields: [coding_assessment_id], references: [id], onUpdate: NoAction)
  users                        users                    @relation(fields: [recruiter_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  resume_variants              resume_variants[]
  saved_jobs                   saved_jobs[]
=======
  video_interviews             video_interviews[]
  auto_apply_logs              auto_apply_logs[]
>>>>>>> 599f85913b8ba825c5e1bf3d90f5cd0c045dd275''',
'''  auto_apply_events            auto_apply_events[]
  auto_apply_queue_items       auto_apply_queue_items[]
  broadcast_messages           broadcast_messages[]
  coding_assessments_on_job    coding_assessments[]     @relation("AssessmentJob")
  conversations                conversations[]
  job_recommendations          job_recommendations[]
  active_assessment_version    assessment_versions?     @relation("JobActiveAssessmentVersion", fields: [active_assessment_version_id], references: [id], onUpdate: NoAction)
  linked_coding_assessment     coding_assessments?      @relation("JobLinkedAssessment", fields: [coding_assessment_id], references: [id], onUpdate: NoAction)
  users                        users                    @relation(fields: [recruiter_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  resume_variants              resume_variants[]
  saved_jobs                   saved_jobs[]
  video_interviews             video_interviews[]
  auto_apply_logs              auto_apply_logs[]''')

# 5. Conflict 5 (Lines 422 to 945 containing the rest of the conflicts)
# Let's extract the full block using regex
pattern = r"<<<<<<< HEAD\n  resumes                                         resumes\[\]\n.*?>>>>>>> 599f85913b8ba825c5e1bf3d90f5cd0c045dd275"
match = re.search(pattern, content, re.DOTALL)
if match:
    full_block = match.group(0)
    # The replacement for the first part inside users
    users_relations = '''  resumes                                         resumes[]
  saved_jobs                                      saved_jobs[]
  video_interviews                                video_interviews[]
  video_consents                                  video_consents[]
  employer_settings                               employer_settings?
  auto_apply_logs                                 auto_apply_logs[]
  interviews_as_interviewer                       interviews[]             @relation("interviewer")
  interviews_as_candidate                         interviews[]             @relation("candidate")
  candidate_skills                                candidate_skills[]
  learning_progress                               learning_progress[]
  skill_credits                                   skill_credits[]
  learning_roadmaps                               learning_roadmaps[]
  learning_audit_logs                             learning_audit_logs[]
  subscriptions                                   subscriptions?
  aiUsageLogs                                     ai_usage_logs[]
  dpdpaConsentLogs                                dpdpa_consent_logs[]
  dataDeletionRequests                            data_deletion_requests[]
}'''
    
    # We want to keep everything from HEAD (the models added after users, up to interview_invites)
    # The HEAD block starts after `}` and ends before `=======`
    head_block_pattern = r"saved_jobs\[\]\n}\n(.*?)\n  @@index\(\[application_id, scheduled_at\], map: \"idx_interview_invites_application\"\)\n======="
    head_match = re.search(head_block_pattern, full_block, re.DOTALL)
    head_models = head_match.group(1) if head_match else ""
    
    replacement_str = users_relations + "\n" + head_models + "\n  @@index([application_id, scheduled_at], map: \"idx_interview_invites_application\")\n}"
    
    content = content.replace(full_block, replacement_str)

# 6. Conflict 6 (Lines 1057 to 1485)
pattern2 = r"<<<<<<< HEAD\n=======\nmodel device_tokens \{.*?>>>>>>> 599f85913b8ba825c5e1bf3d90f5cd0c045dd275\n"
match2 = re.search(pattern2, content, re.DOTALL)
if match2:
    full_block2 = match2.group(0)
    replacement_str2 = '''model device_tokens {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id      String   @db.Uuid
  token        String   @unique
  platform     String   @db.VarChar(20) // 'ios' or 'android'
  last_used_at DateTime @default(now()) @db.Timestamptz(6)
  created_at   DateTime @default(now()) @db.Timestamptz(6)
  users        users    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
}

enum interview_status {
  scheduled
  live
  completed
  cancelled
}

model interviews {
  id                    String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  application_id        String           @db.Uuid
  interviewer_id        String           @db.Uuid
  candidate_id          String           @db.Uuid
  status                interview_status @default(scheduled)
  code_content          String?
  code_language         String?          @default("javascript") @db.VarChar(50)
  notes                 String?
  feedback              String?
  rating                Int?
  scheduled_at          DateTime         @db.Timestamptz(6)
  started_at            DateTime?        @db.Timestamptz(6)
  ended_at              DateTime?        @db.Timestamptz(6)
  created_at            DateTime?        @default(now()) @db.Timestamptz(6)
  updated_at            DateTime?        @default(now()) @db.Timestamptz(6)
  proctoring_violations Json?            @default("[]")

  applications applications @relation(fields: [application_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  interviewer  users        @relation("interviewer", fields: [interviewer_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  candidate    users        @relation("candidate", fields: [candidate_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
}

model auto_apply_logs {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id       String    @db.Uuid
  job_id        String    @db.Uuid
  status        String    @default("pending") @db.VarChar(30) // 'pending', 'applied', 'failed'
  error_message String?
  applied_at    DateTime? @db.Timestamptz(6)
  created_at    DateTime? @default(now()) @db.Timestamptz(6)
  users         users     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  jobs          jobs      @relation(fields: [job_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([user_id, status], map: "idx_auto_apply_logs_user_status")
}

model employer_settings {
  recruiter_id           String    @id @db.Uuid
  scoring_weights        Json      @default("{\\"experience\\": 0.22, \\"skills\\": 0.17, \\"education\\": 0.12, \\"semantic\\": 0.20, \\"keywords\\": 0.14}")
  recommended_percentage Int       @default(10)
  digest_enabled         Boolean   @default(true)
  created_at             DateTime? @default(now()) @db.Timestamptz(6)
  updated_at             DateTime? @default(now()) @db.Timestamptz(6)
  users                  users     @relation(fields: [recruiter_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
}

model screening_audits {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  application_id      String    @db.Uuid
  resume_id           String?   @db.Uuid
  job_id              String    @db.Uuid
  parsed_resume       Json?
  parsed_jd           Json?
  embeddings_metadata Json?
  scoring_breakdown   Json?
  screening_score     Float?
  explanation         Json?
  prompt_version      String?   @db.VarChar(50)
  model_version       String?   @db.VarChar(50)
  processing_time_ms  Int?
  created_at          DateTime? @default(now()) @db.Timestamptz(6)

  applications applications @relation(fields: [application_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([application_id])
  @@index([job_id])
}
'''
    content = content.replace(full_block2, replacement_str2)

# 7. Conflict 7 (Lines 1522 to 1843)
pattern3 = r"<<<<<<< HEAD\n=======\n\nmodel job_recommendations \{.*?>>>>>>> 599f85913b8ba825c5e1bf3d90f5cd0c045dd275\n"
match3 = re.search(pattern3, content, re.DOTALL)
if match3:
    full_block3 = match3.group(0)
    # The models after job_recommendations:
    main_models_pattern = r"model job_recommendations \{.*?\n\}\n(.*?)>>>>>>>"
    main_match = re.search(main_models_pattern, full_block3, re.DOTALL)
    if main_match:
        replacement_str3 = main_match.group(1)
        content = content.replace(full_block3, replacement_str3)

open('backend/prisma/schema.prisma', 'w').write(content)
