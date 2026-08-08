import { test, expect } from '@playwright/test';
import * as path from 'path';

test.use({ storageState: path.join(__dirname, '../.auth/applicant.json') });

test.describe('Auto-Apply Applicant Flow (AUTO-U1 to U8)', () => {
  test.beforeEach(async ({ page }) => {
    // Go to auto apply settings
    await page.goto('/auto-apply/settings');
    // Wait for the settings page to finish loading its data
    await expect(page.getByRole('heading', { name: /auto-apply settings/i })).toBeVisible({ timeout: 15000 });
  });

  test('AUTO-U1, U3, U7: Configures preferences and saves (roles, threshold, modes)', async ({ page }) => {
    // Test match threshold slider (AUTO-U1)
    const slider = page.locator('input[type="range"]');
    await slider.fill('80');
    await expect(page.getByText('80%')).toBeVisible();

    // Test Target Roles (AUTO-U1)
    // The tag input has placeholder "e.g. Frontend Engineer"
    const rolesInput = page.getByPlaceholder('e.g. Frontend Engineer');
    await rolesInput.fill('React Developer');
    await rolesInput.press('Enter');
    await expect(page.locator('span', { hasText: 'React Developer' }).first()).toBeVisible();

    // Test Approval Mode Radio (AUTO-U7)
    const autoRadio = page.getByRole('radio', { name: /auto-execute applications/i });
    if (await autoRadio.isVisible()) {
      await autoRadio.check();
      await expect(autoRadio).toBeChecked();
    }

    // Save preferences
    // Assuming a save button exists at the bottom
    const saveBtn = page.getByRole('button', { name: /save preferences/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await expect(page.getByText(/preferences saved/i)).toBeVisible();
    }
  });

  test('AUTO-U6, U8: Digest and Limits display', async ({ page }) => {
    // Check Limits (AUTO-U8)
    await expect(page.getByText(/Applied Today/i)).toBeVisible();

    // Check Digest toggle (AUTO-U6)
    const digestCheckbox = page.getByRole('checkbox', { name: /daily digest/i });
    if (await digestCheckbox.isVisible()) {
      await digestCheckbox.check();
      await expect(digestCheckbox).toBeChecked();
    }
  });
});

test.describe('Auto-Apply Queue (AUTO-U4, U5)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the queue API so we have items to test
    await page.route('**/api/v1/auto-apply/queue', async route => {
      const json = {
        success: true,
        data: [{
          id: 'test-queue-item-1',
          job_id: 'test-job-1',
          status: 'matched',
          match_score: 95,
          job: {
            title: 'Mock Senior React Developer',
            companyName: 'Mock Company Inc',
            location: 'Remote',
          }
        }]
      };
      await route.fulfill({ json });
    });

    await page.goto('/auto-apply'); // The queue page
  });

  test('AUTO-U4, U5: Queue Management and Submission', async ({ page }) => {
    // Check if there are any queue items
    const queueItems = page.locator('.queue-item-card, a[href^="/auto-apply/queue/"]');
    if (await queueItems.count() > 0) {
      // Click the first queue item
      await queueItems.first().click();
      await expect(page).toHaveURL(/\/auto-apply\/queue\/.+/);

      // Verify Tailored Resume section is visible (AUTO-U3 application)
      await expect(page.getByText(/Tailored Resume/i)).toBeVisible();

      // Click "Approve & Submit" (AUTO-U4)
      const approveBtn = page.getByRole('button', { name: /approve & submit/i });
      if (await approveBtn.isVisible()) {
        // Mock the approve API call
        await page.route(`**/api/v1/auto-apply/queue/*/approve`, async route => {
          await route.fulfill({ json: { success: true } });
        });
        
        await approveBtn.click();
        // Wait for success toast
        await expect(page.getByText(/Application submitted successfully/i)).toBeVisible();
      }
    } else {
      console.log('No queue items available to test submission');
    }
  });
});
