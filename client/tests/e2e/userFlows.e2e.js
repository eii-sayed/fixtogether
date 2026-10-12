/**
 * FixTogether End-to-End (E2E) Browser Test Suite
 * Powered by Puppeteer
 *
 * Usage:
 *   node client/tests/e2e/userFlows.e2e.js
 */

const puppeteer = require('puppeteer');

const CLIENT_BASE_URL = process.env.TEST_CLIENT_URL || 'http://localhost:5173';
const ADMIN_BASE_URL = process.env.TEST_ADMIN_URL || 'http://localhost:5174';

const log = (step, msg) => console.log(`[\x1b[36m${step}\x1b[0m] ${msg}`);
const success = (msg) => console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
const failure = (msg) => console.error(`\x1b[31m✘ ${msg}\x1b[0m`);

async function runE2ETests() {
  console.log('====================================================');
  console.log('   FixTogether Comprehensive E2E Browser Test Suite  ');
  console.log('====================================================\n');

  let browser;
  let passedCount = 0;
  let totalCount = 0;

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
      await p.waitForSelector('body', { timeout: 5000 });
      const content = await p.content();
      if (!content.includes('Forum') && !content.includes('Discussion') && !content.includes('Question')) {
        throw new Error('Forum page did not render discussions or search controls');
      }
    });

    // ---------------------------------------------------------------
    // 3. Login Page & Form Inputs
    // ---------------------------------------------------------------
    await assertTest('Login Page renders authentication form with email and password inputs', async (p) => {
      await p.goto(`${CLIENT_BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const emailInput = await p.$('input[type="email"]');
      const passwordInput = await p.$('input[type="password"]');
      if (!emailInput || !passwordInput) {
        throw new Error('Email or password input fields not found on /login');
      }
    });

    // ---------------------------------------------------------------
    // 4. Protected Route Redirects
    // ---------------------------------------------------------------
    await assertTest('Accessing protected /dashboard while logged out redirects to /login', async (p) => {
      await p.goto(`${CLIENT_BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const currentUrl = p.url();
      if (!currentUrl.includes('/login')) {
        throw new Error(`Expected redirect to /login, but stayed at: ${currentUrl}`);
      }
    });

    // ---------------------------------------------------------------
    // 5. Admin Gateway Gateway Redirection
    // ---------------------------------------------------------------
    await assertTest('Accessing /admin from client renders Standalone Admin Gateway notice', async (p) => {
      await p.goto(`${CLIENT_BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const content = await p.content();
      if (!content.includes('Admin') && !content.includes('Command Center')) {
        throw new Error('Admin gateway redirect screen not displayed');
      }
    });

  } catch (globalErr) {
    console.error('Fatal E2E Runner Error:', globalErr);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('====================================================');
  console.log(`   E2E Results: ${passedCount} / ${totalCount} Passed`);
  console.log('====================================================\n');
}

if (require.main === module) {
  runE2ETests().catch(console.error);
}

module.exports = { runE2ETests };
