import puppeteer from 'puppeteer';
import { StorageService } from './storage.service';
import { uploadToS3 } from '../utils/s3';
import { AiInterviewSession, InterviewQuestion, InterviewResponse } from '../models/interview.model';
import fs from 'fs/promises';
import path from 'path';

const LOG_PREFIX = '[ReportGeneratorService]';

export const ReportGeneratorService = {
  /**
   * Generates a PDF report using Puppeteer, uploads it to active storage, and returns the URL.
   */
  async generatePdfReport(
    session: AiInterviewSession,
    questions: InterviewQuestion[],
    responses: InterviewResponse[],
    summaryText: string,
    strengths: string[],
    weaknesses: string[],
    recommendations: string[],
  ): Promise<string> {
    console.log(`${LOG_PREFIX} Generating PDF report for session ${session.id}...`);

    const htmlContent = this.buildHtmlReport(
      session,
      questions,
      responses,
      summaryText,
      strengths,
      weaknesses,
      recommendations,
    );

    let browser;
    let pdfBuffer: Buffer;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      pdfBuffer = Buffer.from(
        await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm',
          },
        })
      );
    } catch (err) {
      console.error(`${LOG_PREFIX} Puppeteer PDF generation failed:`, err);
      throw new Error(`Failed to render PDF report: ${err instanceof Error ? err.message : 'Unknown error'}`, { cause: err });
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }

    const filename = `report-${session.id}.pdf`;

    // 1. Check if S3 is configured
    const isS3Configured = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
    );

    if (isS3Configured) {
      try {
        console.log(`${LOG_PREFIX} S3 detected. Uploading report to S3...`);
        const s3Url = await uploadToS3(pdfBuffer, filename, 'application/pdf', 'reports');
        return s3Url;
      } catch (err) {
        console.error(`${LOG_PREFIX} S3 upload failed, trying next provider:`, err);
      }
    }

    // 2. Check if Cloudinary is configured
    const isCloudinaryConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (isCloudinaryConfigured) {
      try {
        console.log(`${LOG_PREFIX} Cloudinary detected. Uploading report to Cloudinary...`);
        const fileMock: Express.Multer.File = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
          buffer: pdfBuffer,
          destination: '',
          filename: filename,
          path: '',
          stream: null as any,
        };
        const uploadResult = await StorageService.uploadAny(fileMock);
        return uploadResult.url;
      } catch (err) {
        console.error(`${LOG_PREFIX} Cloudinary upload failed, falling back to local storage:`, err);
      }
    }

    // 3. Fallback to Local Storage
    try {
      console.log(`${LOG_PREFIX} Falling back to local storage...`);
      const uploadDir = path.join(__dirname, '../../uploads/reports');
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, pdfBuffer);
      return `/uploads/reports/${filename}`;
    } catch (err) {
      console.error(`${LOG_PREFIX} Local file write failed:`, err);
      throw new Error(`Failed to save PDF report: ${err instanceof Error ? err.message : 'Unknown error'}`, { cause: err });
    }
  },

  /**
   * Helper to compile HTML layout with styling
   */
  buildHtmlReport(
    session: AiInterviewSession,
    questions: InterviewQuestion[],
    responses: InterviewResponse[],
    summaryText: string,
    strengths: string[],
    weaknesses: string[],
    recommendations: string[],
  ): string {
    const formattedDate = new Date(session.completed_at || new Date()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const rubricScores = (session.rubric_scores as Record<string, number>) || {
      communicationClarity: 0,
      contentRelevance: 0,
      responseStructure: 0,
      depthOfKnowledge: 0,
      confidenceIndicators: 0,
    };

    const questionAnalysisHtml = questions.map((q, idx) => {
      const resp = responses.find((r) => r.question_id === q.id);
      const qScore = resp?.ai_score ?? 'N/A';
      const qRubrics = (resp?.rubric_scores as Record<string, number>) || {};
      const qFeedback = (resp?.ai_feedback as Record<string, string>) || {
        feedbackText: 'No feedback generated.',
        suggestedImprovements: 'No suggestions provided.',
      };

      return `
        <div class="question-card">
          <div class="question-header">
            <span class="question-number">Question ${idx + 1}</span>
            <span class="category-badge ${q.category}">${q.category.toUpperCase()}</span>
            <span class="score-badge ${qScore !== 'N/A' && Number(qScore) >= 70 ? 'pass' : 'warn'}">Score: ${qScore}</span>
          </div>
          <div class="question-body">
            <p class="question-text"><strong>Q:</strong> ${q.question_text}</p>
            <div class="candidate-response">
              <strong>Candidate Response:</strong>
              <p>${resp?.response_text ? resp.response_text.replace(/\n/g, '<br>') : '<em>No response provided.</em>'}</p>
            </div>
            ${resp ? `
            <div class="rubrics-grid">
              <div class="rubric-item">
                <span class="rubric-label">Communication</span>
                <span class="rubric-val">${qRubrics.communicationClarity ?? 0}/100</span>
              </div>
              <div class="rubric-item">
                <span class="rubric-label">Relevance</span>
                <span class="rubric-val">${qRubrics.contentRelevance ?? 0}/100</span>
              </div>
              <div class="rubric-item">
                <span class="rubric-label">Structure</span>
                <span class="rubric-val">${qRubrics.responseStructure ?? 0}/100</span>
              </div>
              <div class="rubric-item">
                <span class="rubric-label">Depth</span>
                <span class="rubric-val">${qRubrics.depthOfKnowledge ?? 0}/100</span>
              </div>
              <div class="rubric-item">
                <span class="rubric-label">Confidence</span>
                <span class="rubric-val">${qRubrics.confidenceIndicators ?? 0}/100</span>
              </div>
            </div>
            <div class="feedback-section">
              <p><strong>Feedback:</strong> ${qFeedback.feedbackText}</p>
              <p><strong>Suggested Improvements:</strong> ${qFeedback.suggestedImprovements}</p>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            background: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 13px;
          }
          
          .report-container {
            padding: 10px;
          }
          
          .header-banner {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: #ffffff;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          
          .header-banner h1 {
            margin: 0;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          
          .header-banner p {
            margin: 5px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          
          .metadata-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            padding-top: 15px;
            font-size: 12px;
          }
          
          .metadata-item span {
            display: block;
            opacity: 0.7;
          }
          
          .metadata-item strong {
            font-size: 13px;
          }
          
          .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 20px;
            margin-bottom: 25px;
          }
          
          .card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
          }
          
          .score-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          
          .score-circle {
            width: 110px;
            height: 110px;
            border-radius: 50%;
            background: #eff6ff;
            border: 6px solid #3b82f6;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
          }
          
          .score-number {
            font-size: 36px;
            font-weight: 700;
            color: #1e3a8a;
          }
          
          .score-label {
            font-size: 14px;
            font-weight: 600;
            color: #4b5563;
          }
          
          .rubrics-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            margin-top: 15px;
          }
          
          .rubric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
          }
          
          .rubric-bar-container {
            width: 50%;
            background: #e5e7eb;
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
            margin: 0 10px;
          }
          
          .rubric-bar {
            background: #3b82f6;
            height: 100%;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a8a;
            margin-top: 0;
            margin-bottom: 12px;
            border-bottom: 2px solid #eff6ff;
            padding-bottom: 6px;
          }
          
          .bullets-list {
            margin: 0;
            padding-left: 20px;
          }
          
          .bullets-list li {
            margin-bottom: 8px;
          }
          
          .strength-item::marker {
            color: #10b981;
          }
          
          .weakness-item::marker {
            color: #f59e0b;
          }
          
          .recommendation-item::marker {
            color: #3b82f6;
          }
          
          .question-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 20px;
            page-break-inside: avoid;
            overflow: hidden;
          }
          
          .question-header {
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .question-number {
            font-weight: 700;
            color: #1e3a8a;
            font-size: 14px;
          }
          
          .category-badge {
            font-size: 10px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 9999px;
          }
          
          .category-badge.technical {
            background: #eff6ff;
            color: #1e40af;
          }
          
          .category-badge.behavioral {
            background: #ecfdf5;
            color: #065f46;
          }
          
          .category-badge.situational {
            background: #fffbeb;
            color: #92400e;
          }
          
          .score-badge {
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
          }
          
          .score-badge.pass {
            background: #d1fae5;
            color: #065f46;
          }
          
          .score-badge.warn {
            background: #fef3c7;
            color: #92400e;
          }
          
          .question-body {
            padding: 20px;
          }
          
          .question-text {
            margin-top: 0;
            font-size: 13.5px;
          }
          
          .candidate-response {
            background: #f9fafb;
            border-left: 3px solid #d1d5db;
            padding: 10px 15px;
            margin: 15px 0;
            font-size: 12.5px;
          }
          
          .candidate-response p {
            margin: 5px 0 0 0;
          }
          
          .rubrics-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin: 15px 0;
            text-align: center;
          }
          
          .rubric-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px;
          }
          
          .rubric-label {
            display: block;
            font-size: 10px;
            color: #6b7280;
            font-weight: 500;
          }
          
          .rubric-val {
            font-size: 13px;
            font-weight: 700;
            color: #1f2937;
          }
          
          .feedback-section {
            background: #eff6ff;
            border-radius: 8px;
            padding: 15px;
            font-size: 12px;
            margin-top: 15px;
          }
          
          .feedback-section p {
            margin: 0 0 10px 0;
          }
          
          .feedback-section p:last-child {
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- Banner Header -->
          <div class="header-banner">
            <h1>Mock Interview Performance Report</h1>
            <p>Comprehensive AI-powered feedback & skills evaluation</p>
            <div class="metadata-grid">
              <div class="metadata-item">
                <span>ROLE TITLE</span>
                <strong>${session.role_title}</strong>
              </div>
              <div class="metadata-item">
                <span>EVALUATION DATE</span>
                <strong>${formattedDate}</strong>
              </div>
            </div>
          </div>
          
          <!-- Summary Dashboard -->
          <div class="dashboard-grid">
            <!-- Overall Score Card -->
            <div class="card score-card">
              <div class="score-circle">
                <span class="score-number">${session.overall_score ?? 0}</span>
              </div>
              <span class="score-label">Overall Readiness Rating</span>
              
              <div class="rubrics-list">
                <div class="rubric-row">
                  <span>Communication</span>
                  <div class="rubric-bar-container">
                    <div class="rubric-bar" style="width: ${rubricScores.communicationClarity}%"></div>
                  </div>
                  <strong>${rubricScores.communicationClarity}%</strong>
                </div>
                <div class="rubric-row">
                  <span>Relevance</span>
                  <div class="rubric-bar-container">
                    <div class="rubric-bar" style="width: ${rubricScores.contentRelevance}%"></div>
                  </div>
                  <strong>${rubricScores.contentRelevance}%</strong>
                </div>
                <div class="rubric-row">
                  <span>Structure</span>
                  <div class="rubric-bar-container">
                    <div class="rubric-bar" style="width: ${rubricScores.responseStructure}%"></div>
                  </div>
                  <strong>${rubricScores.responseStructure}%</strong>
                </div>
                <div class="rubric-row">
                  <span>Depth</span>
                  <div class="rubric-bar-container">
                    <div class="rubric-bar" style="width: ${rubricScores.depthOfKnowledge}%"></div>
                  </div>
                  <strong>${rubricScores.depthOfKnowledge}%</strong>
                </div>
                <div class="rubric-row">
                  <span>Confidence</span>
                  <div class="rubric-bar-container">
                    <div class="rubric-bar" style="style:width: ${rubricScores.confidenceIndicators}%"></div>
                  </div>
                  <strong>${rubricScores.confidenceIndicators}%</strong>
                </div>
              </div>
            </div>
            
            <!-- Qualitative Summary -->
            <div class="card">
              <h3 class="section-title">Performance Executive Summary</h3>
              <p style="margin-top:0; margin-bottom:15px; font-size:12.5px;">${summaryText}</p>
              
              <h4 style="margin: 15px 0 8px 0; color:#1e3a8a; font-size:13px;">Key Strengths</h4>
              <ul class="bullets-list">
                ${strengths.map((s) => `<li class="strength-item">${s}</li>`).join('')}
              </ul>
              
              <h4 style="margin: 15px 0 8px 0; color:#1e3a8a; font-size:13px;">Areas for Improvement</h4>
              <ul class="bullets-list">
                ${weaknesses.map((w) => `<li class="weakness-item">${w}</li>`).join('')}
              </ul>
              
              <h4 style="margin: 15px 0 8px 0; color:#1e3a8a; font-size:13px;">Actionable Recommendations</h4>
              <ul class="bullets-list">
                ${recommendations.map((r) => `<li class="recommendation-item">${r}</li>`).join('')}
              </ul>
            </div>
          </div>
          
          <h2 style="font-size:18px; color:#1e3a8a; font-weight:700; margin-top:30px; margin-bottom:15px; border-bottom:2px solid #3b82f6; padding-bottom:5px;">
            Detailed Question & Response Breakdown
          </h2>
          
          <!-- Detailed breakdown -->
          ${questionAnalysisHtml}
        </div>
      </body>
      </html>
    `;
  },
};
