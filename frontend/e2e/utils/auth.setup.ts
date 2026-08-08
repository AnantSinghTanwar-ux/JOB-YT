import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const applicantFile = path.join(__dirname, '../.auth/applicant.json');
const recruiterFile = path.join(__dirname, '../.auth/recruiter.json');

setup('setup applicant auth', async ({ page }) => {
  // Generate a random email for test isolation
  const randomEmail = `test_applicant_${Date.now()}@example.com`;
  
  await page.goto('/register');
  // Wait for the form to be ready
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  
  await page.getByPlaceholder('you@example.com').fill(randomEmail);
  await page.getByPlaceholder('Min 8 chars, 1 upper, 1 lower, 1 number').fill('StrongerPassword1!');
  await page.getByRole('button', { name: /create account/i }).click();
  
  // Wait for success screen
  try {
    await expect(page.getByText(/account created/i)).toBeVisible({ timeout: 5000 });
  } catch (e) {
    await page.screenshot({ path: 'applicant-error.png', fullPage: true });
    await fs.promises.writeFile('applicant-error-page.html', await page.content());
    const errorText = await page.locator('.text-red-600').textContent().catch(() => null);
    console.error('Registration failed with error:', errorText);
    throw e;
  }
  
  // Navigate to login
  await page.getByRole('button', { name: /back to sign in/i }).click();
  
  // Login
  await page.getByPlaceholder('you@example.com').fill(randomEmail);
  await page.getByPlaceholder('••••••••').fill('StrongerPassword1!');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait until dashboard loads
  await expect(page).toHaveURL(/\/dashboard/);
  
  // Save storage state
  await page.context().storageState({ path: applicantFile });
});

setup('setup recruiter auth', async ({ page }) => {
  const randomEmail = `test_recruiter_${Date.now()}@example.com`;
  
  await page.goto('/employer-signup');
  // Wait for the form to be ready
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  
  await page.getByPlaceholder('you@example.com').fill(randomEmail);
  await page.getByPlaceholder('Min 8 chars, 1 upper, 1 lower, 1 number').fill('StrongerPassword1!');
  await page.getByRole('button', { name: /create account/i }).click();
  
  try {
    await expect(page.getByText(/account created/i)).toBeVisible({ timeout: 5000 });
  } catch (e) {
    const errorText = await page.locator('.text-red-600').textContent().catch(() => null);
    console.error('Registration failed with error:', errorText);
    throw e;
  }
  
  await page.getByRole('button', { name: /back to sign in/i }).click();
  
  await page.getByPlaceholder('you@example.com').fill(randomEmail);
  await page.getByPlaceholder('••••••••').fill('StrongerPassword1!');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait until recruiter dashboard loads
  await expect(page).toHaveURL(/\/recruiter\/dashboard/);
  
  await page.context().storageState({ path: recruiterFile });
});
