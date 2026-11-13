/**
 * FixTogether End-to-End (E2E) Browser Test Suite
 * Powered by Puppeteer
 *
 * Usage:
 *   node client/tests/e2e/userFlows.e2e.js
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const CLIENT_BASE_URL = process.env.TEST_CLIENT_URL || 'http://localhost:5173';

const log = (step, msg) => console.log(`[\x1b[36m${step}\x1b[0m] ${msg}`);
const success = (msg) => console.log(`\x1b[32mPASS ${msg}\x1b[0m`);
const failure = (msg) => console.error(`\x1b[31mFAIL ${msg}\x1b[0m`);

async function runE2ETests() {
  console.log('====================================================');
  console.log('   FixTogether Comprehensive E2E Browser Test Suite  ');
  console.log('====================================================\n');

  let browser;
  let passedCount = 0;
  let totalCount = 0;
  let runnerFailed = false;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Helper assertion
    const assertTest = async (testName, testFn) => {
      totalCount++;
      log(`TEST ${totalCount}`, testName);
      try {
        await testFn(page);
        passedCount++;
        success(`PASSED: ${testName}\n`);
      } catch (err) {
        runnerFailed = true;
        failure(`FAILED: ${testName}`);
        console.error(`  Error: ${err.message}\n`);
      }
    };

    // ---------------------------------------------------------------
    // 1. Landing Page & Public Navigation
    // ---------------------------------------------------------------
    await assertTest('Public Landing Page loads with branding & SEO title', async (p) => {
      await p.goto(CLIENT_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const title = await p.title();
      if (!title || !title.toLowerCase().includes('fix')) {
        throw new Error(`Unexpected page title: "${title}"`);
      }
    });

    // ---------------------------------------------------------------
    // 2. Community Forum Public Access
    // ---------------------------------------------------------------
    await assertTest('Public Forum allows browsing discussions without login', async (p) => {
      await p.goto(`${CLIENT_BASE_URL}/forum`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await p.waitForSelector('h1', { timeout: 10000 });
      const heading = await p.$eval('h1', (element) => element.textContent.trim());
      const searchInput = await p.$('input[placeholder^="Search questions"]');
      if (!heading.includes('Q&A Community') || !searchInput) {
        throw new Error('Forum page did not render its heading and search controls');
      }
    });

    // ---------------------------------------------------------------
    // 3. Login Page & Form Inputs
    // ---------------------------------------------------------------
    await assertTest('Login Page renders authentication form with email and password inputs', async (p) => {
      await p.goto(`${CLIENT_BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const emailInput = await p.waitForSelector('input[type="email"]', { timeout: 10000 });
      const passwordInput = await p.waitForSelector('input[type="password"]', { timeout: 10000 });
      if (!emailInput || !passwordInput) {
        throw new Error('Email or password input fields not found on /login');
      }
    });

    // ---------------------------------------------------------------
    // 4. Protected Route Redirects
    // ---------------------------------------------------------------
    await assertTest('Accessing protected /dashboard while logged out redirects to /login', async (p) => {
      await p.goto(`${CLIENT_BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await p.waitForFunction(() => window.location.pathname === '/login', { timeout: 10000 });
      const currentUrl = p.url();
      if (!currentUrl.includes('/login')) {
        throw new Error(`Expected redirect to /login, but stayed at: ${currentUrl}`);
      }
    });

    // ---------------------------------------------------------------
    // 5. Admin Gateway Gateway Redirection
    // ---------------------------------------------------------------
    await assertTest('Accessing /admin from client redirects to the standalone admin app', async (p) => {
      await p.goto(`${CLIENT_BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await p.waitForFunction(() => window.location.port === '5174', { timeout: 10000 });
      await p.waitForSelector('#root', { timeout: 5000 });
    });

  } catch (globalErr) {
    runnerFailed = true;
    console.error('Fatal E2E Runner Error:', globalErr);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        runnerFailed = true;
        console.error('Failed to close the E2E browser:', closeError);
      }
    }
  }

  console.log('====================================================');
  console.log(`   E2E Results: ${passedCount} / ${totalCount} Passed`);
  console.log('====================================================\n');

  if (runnerFailed || passedCount !== totalCount) {
    process.exitCode = 1;
  }

  return { passedCount, totalCount, failedCount: totalCount - passedCount };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (import.meta.url === invokedPath) {
  runE2ETests().catch((error) => {
    console.error('Fatal E2E Runner Error:', error);
    process.exitCode = 1;
  });
}
