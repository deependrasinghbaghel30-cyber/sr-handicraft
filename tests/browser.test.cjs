const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS = path.join(__dirname, 'artifacts');
const OWNER = 'deependrasinghbaghel30@gmail.com';
const PASSWORD = 'Local-test-only-123!';
const AUTH = 'http://127.0.0.1:9100';
const PROJECT = 'demo-sr-handicraft';
async function authApi(action, body) {
  const response = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${action}?key=demo-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const result = await response.json();
  assert.ok(response.ok, JSON.stringify(result));
  return result;
}
async function verifyEmail(email) {
  const result = await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
  const code = [...result.oobCodes].reverse().find(c => c.email === email && c.requestType === 'VERIFY_EMAIL');
  assert.ok(code, `Expected emulator verification email for ${email}`);
  await authApi('accounts:update', { oobCode: code.oobCode });
}
async function signIn(page, email) {
  await page.locator('#le').fill(email);
  await page.locator('#lp').fill(PASSWORD);
  await page.locator('#lb').click();
}

test('real browser verifies invitation, owner migration, reset flow, refresh and immediate revocation', { timeout: 180000 }, async t => {
  fs.mkdirSync(path.join(ARTIFACTS, 'sdk'), { recursive: true });
  for (const name of ['app', 'auth', 'firestore']) {
    const filename = `firebase-${name}.js`, target = path.join(ARTIFACTS, 'sdk', filename);
    if (!fs.existsSync(target)) execFileSync('curl', ['-fsS', '--max-time', '30', `https://www.gstatic.com/firebasejs/10.12.2/${filename}`, '-o', target]);
  }
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: {
    host: '127.0.0.1', port: 8100, rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')
  }});
  t.after(() => env.cleanup());
  const server = http.createServer((req, res) => {
    const filename = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '');
    if (!/^[\w.-]+$/.test(filename)) { res.writeHead(404).end(); return; }
    const file = path.join(ROOT, filename);
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const type = /\.(m?js)$/.test(file) ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/json';
    res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/admin.html?emu`;
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const blocked = [], errors = [];
  async function pageForUser() {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1') return route.continue();
      if (u.origin === 'https://www.gstatic.com' && /^\/firebasejs\/10\.12\.2\/firebase-(app|auth|firestore)\.js$/.test(u.pathname)) {
        return route.fulfill({ path: path.join(ARTIFACTS, 'sdk', path.basename(u.pathname)), contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      blocked.push(u.origin); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.locator('#le').waitFor();
    return page;
  }
  async function membership(email) {
    let data;
    await env.withSecurityRulesDisabled(async c => {
      const snapshot = await getDoc(doc(c.firestore(), 'admins', email));
      data = snapshot.exists() ? snapshot.data() : null;
    });
    return data;
  }
  {
    await env.clearFirestore();
    await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
    await env.withSecurityRulesDisabled(async c => {
      const db = c.firestore();
      await setDoc(doc(db, 'products', '1'), { id: 1, name: 'Local test table', cat: 'furniture', sub: 'Tables', price: 100, img: [] });
      // Represents an existing owner record from the email-only rules.
      await setDoc(doc(db, 'admins', OWNER), { addedBy: OWNER, at: 'legacy' });
    });
    const ownerAccount = await authApi('accounts:signUp', { email: OWNER, password: PASSWORD, returnSecureToken: true });
    const ownerPage = await pageForUser();
    await signIn(ownerPage, OWNER);
    await ownerPage.locator('#verify-send').waitFor();
    assert.equal(await ownerPage.locator('[data-tab="team"]').count(), 0);
    assert.equal((await membership(OWNER)).uid, undefined);
    await ownerPage.locator('#verify-send').click();
    await ownerPage.getByText('Verification email sent.', { exact: false }).waitFor();
    await ownerPage.screenshot({ path: path.join(ARTIFACTS, 'owner-verification.png') });
    await verifyEmail(OWNER);
    await ownerPage.locator('#verify-check').click();
    await ownerPage.locator('[data-tab="team"]').waitFor();
    assert.equal((await membership(OWNER)).uid, ownerAccount.localId);
    assert.equal((await membership(OWNER)).at, 'legacy');
    await ownerPage.locator('[data-tab="team"]').click();
    await ownerPage.locator('#te').fill('staff@example.com');
    await ownerPage.locator('#tb').click();
    await ownerPage.getByText('staff@example.com (awaiting verification)', { exact: false }).waitFor();
    assert.equal((await membership('staff@example.com')).uid, undefined);
    await ownerPage.locator('#te').fill('staff@example.com');
    await ownerPage.locator('#tb').click();
    await ownerPage.getByText('This person is already listed.', { exact: false }).waitFor();
    const staffPage = await pageForUser();
    await staffPage.locator('#le').fill('staff@example.com');
    await staffPage.locator('#lp').fill(PASSWORD);
    await staffPage.locator('#signup').click();
    await staffPage.locator('#verify-send').waitFor();
    assert.equal((await membership('staff@example.com')).uid, undefined);
    // Unverified sign-in may exist, but the backend still rejects content writes.
    const writeCode = await staffPage.evaluate(async () => {
      const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      try { await setDoc(doc(getFirestore(), 'products', 'attack'), { name: 'must fail' }); return 'allowed'; }
      catch (e) { return e.code; }
    });
    assert.equal(writeCode, 'permission-denied');
    // The first check leaves the unverified account safely on the same screen.
    await staffPage.locator('#verify-check').click();
    await staffPage.locator('#verify-send').waitFor();
    await staffPage.waitForFunction(() => document.getElementById('toast').textContent.includes('Verification email sent'));
    await verifyEmail('staff@example.com');
    await staffPage.locator('#verify-check').click();
    await staffPage.locator('#addp').waitFor();
    const activeStaff = await membership('staff@example.com');
    assert.ok(activeStaff.uid); assert.equal(activeStaff.status, 'active');
    assert.equal(await staffPage.locator('[data-tab="team"]').count(), 0);
    await staffPage.reload();
    await staffPage.locator('#addp').waitFor();
    await staffPage.locator('.pc').first().click();
    await staffPage.locator('.sheet').waitFor();
    ownerPage.once('dialog', dialog => dialog.accept());
    await ownerPage.locator('[data-rm="staff@example.com"]').click();
    await staffPage.getByRole('heading', { name: 'Access unavailable' }).waitFor();
    assert.equal(await staffPage.locator('.sheet,.foot').count(), 0);
    await staffPage.screenshot({ path: path.join(ARTIFACTS, 'staff-revoked.png') });
    await staffPage.reload();
    await staffPage.getByRole('heading', { name: 'Access unavailable' }).waitFor();
    await staffPage.locator('#so').click();
    await staffPage.locator('#le').fill('staff@example.com');
    await staffPage.locator('#lp').fill(PASSWORD);
    await staffPage.locator('#signup').click();
    await staffPage.getByText('This email already has an account.', { exact: false }).waitFor();
    await staffPage.locator('#fp').click();
    await staffPage.getByText('A reset does not grant website access.', { exact: false }).waitFor();
    assert.equal(await membership('staff@example.com'), null);
    assert.deepEqual(blocked, [], 'Browser must never contact production services');
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log('PASS: owner verification + legacy UID claim; pending invite; duplicate prevention; unverified backend rejection; verified activation; persisted login; open-sheet revocation; revoked reload; existing-account/reset guidance.');
  }
});
