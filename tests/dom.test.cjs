const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
const appSdk = require('firebase/app');
const authSdk = require('firebase/auth');
const firestore = require('firebase/firestore');
const ROOT = path.resolve(__dirname, '..');
const PROJECT = 'demo-sr-handicraft';
const OWNER = 'deependrasinghbaghel30@gmail.com';
const PASSWORD = 'Local-test-only-123!';
const AUTH = 'http://127.0.0.1:9100';
async function authApi(action, body) {
  const response = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${action}?key=demo-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const result = await response.json(); assert.ok(response.ok, JSON.stringify(result)); return result;
}
async function verifyEmail(email) {
  const result = await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
  const code = [...result.oobCodes].reverse().find(c => c.email === email && c.requestType === 'VERIFY_EMAIL');
  assert.ok(code, `Expected verification email for ${email}`);
  await authApi('accounts:update', { oobCode: code.oobCode });
}
async function until(read, label) {
  const end = Date.now() + 15000;
  while (Date.now() < end) { const result = read(); if (result) return result; await new Promise(r => setTimeout(r, 30)); }
  throw new Error(`Timed out: ${label}`);
}

test('actual admin DOM with real Auth/Firestore emulators verifies, claims and revokes access', { timeout: 90000 }, async t => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: {
    host: '127.0.0.1', port: 8100, rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')
  }});
  t.after(() => env.cleanup());
  await env.clearFirestore();
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  const sessions = [];
  t.after(async () => { for (const s of sessions) { await authSdk.signOut(authSdk.getAuth(s.app)); s.dom.window.close(); await appSdk.deleteApp(s.app); } });
  async function readMembership(email) {
    let data;
    await env.withSecurityRulesDisabled(async c => {
      const d = await firestore.getDoc(firestore.doc(c.firestore(), 'admins', email)); data = d.exists() ? d.data() : null;
    });
    return data;
  }
  async function openAdmin(name) {
    const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
    const dom = new JSDOM('<div id="app"></div><div id="toast"></div>', { url: 'http://127.0.0.1/admin.html?emu' });
    const w = dom.window;
    const session = { dom, app: null, $: selector => w.document.querySelector(selector), text: () => w.document.body.textContent };
    const helpers = await import('../admin-access.mjs');
    const bindings = { ...appSdk, ...authSdk, ...firestore, ...helpers,
      initializeApp: config => (session.app = appSdk.initializeApp(config, name)),
      window: w, document: w.document, location: w.location, navigator: w.navigator,
      MutationObserver: w.MutationObserver, Image: w.Image,
      alert: message => { throw new Error(message); }, confirm: () => true
    };
    // Execute the unchanged application body in the SDK's own JavaScript realm.
    // Only import resolution and browser globals are supplied by this harness.
    const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
      .replace(/^import .* from .*;$/gm, '');
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction(...Object.keys(bindings), fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + '\n' + source)(...Object.values(bindings));
    sessions.push(session);
    await until(() => session.$('#le'), 'login form');
    return session;
  }
  async function login(session, email) {
    session.$('#le').value = email; session.$('#lp').value = PASSWORD;
    await session.$('#lf').onsubmit({ preventDefault() {} });
  }
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await firestore.setDoc(firestore.doc(db, 'admins', OWNER), { addedBy: OWNER, at: 'legacy' });
    await firestore.setDoc(firestore.doc(db, 'products', '1'), { id: 1, name: 'Local test table', cat: 'furniture', sub: 'Tables', price: 100, img: [] });
  });
  const ownerAccount = await authApi('accounts:signUp', { email: OWNER, password: PASSWORD, returnSecureToken: true });
  const owner = await openAdmin('dom-owner');
  await login(owner, OWNER);
  await until(() => owner.$('#verify-send'), 'unverified owner screen');
  assert.equal(owner.$('[data-tab="team"]'), null);
  assert.equal((await readMembership(OWNER)).uid, undefined);
  await owner.$('#verify-send').onclick();
  assert.match(owner.text(), /Verification email sent/);
  await verifyEmail(OWNER);
  await owner.$('#verify-check').onclick();
  await until(() => owner.$('[data-tab="team"]'), 'verified owner team tab');
  assert.equal((await readMembership(OWNER)).uid, ownerAccount.localId);
  assert.equal((await readMembership(OWNER)).at, 'legacy');
  owner.$('[data-tab="team"]').onclick();
  await until(() => owner.$('#te'), 'team form');
  owner.$('#te').value = 'staff@example.com';
  await owner.$('#tb').onclick();
  await until(() => owner.text().includes('staff@example.com (awaiting verification)'), 'pending invitation');
  assert.equal((await readMembership('staff@example.com')).uid, undefined);
  owner.$('#te').value = 'staff@example.com';
  await owner.$('#tb').onclick();
  assert.match(owner.$('#terr').textContent, /already listed/);
  const staff = await openAdmin('dom-staff');
  staff.$('#le').value = 'staff@example.com'; staff.$('#lp').value = PASSWORD;
  await staff.$('#signup').onclick();
  await until(() => staff.$('#verify-send'), 'staff verification card');
  assert.equal((await readMembership('staff@example.com')).uid, undefined);
  await assertFails(firestore.setDoc(firestore.doc(firestore.getFirestore(staff.app), 'products', 'attack'), { name: 'must fail' }));
  await staff.$('#verify-check').onclick();
  assert.ok(staff.$('#verify-send'), 'unverified refresh stays denied');
  await verifyEmail('staff@example.com');
  await staff.$('#verify-check').onclick();
  await until(() => staff.$('#addp'), 'verified staff editor');
  assert.equal((await readMembership('staff@example.com')).uid, authSdk.getAuth(staff.app).currentUser.uid);
  assert.equal(staff.$('[data-tab="team"]'), null);
  staff.$('.pc').onclick(); assert.ok(staff.$('.sheet'));
  await owner.$('[data-rm="staff@example.com"]').onclick();
  await until(() => staff.text().includes('Access unavailable'), 'live revocation');
  assert.equal(staff.$('.sheet'), null); assert.equal(staff.$('.foot'), null);
  await assertFails(firestore.setDoc(firestore.doc(firestore.getFirestore(staff.app), 'products', 'attack'), { name: 'must fail again' }));
  await staff.$('#retry-access').onclick();
  assert.match(staff.text(), /Access unavailable/);
  await staff.$('#so').onclick();
  await until(() => staff.$('#le'), 'signed out login');
  staff.$('#le').value = 'staff@example.com'; staff.$('#lp').value = PASSWORD;
  await staff.$('#signup').onclick();
  assert.match(staff.$('#lerr').textContent, /already has an account/);
  await staff.$('#fp').onclick({ preventDefault() {} });
  assert.match(staff.$('#lerr').textContent, /A reset does not grant website access/);
  assert.equal(await readMembership('staff@example.com'), null);
  console.log('PASS actual DOM handlers: owner/staff verification, legacy owner preservation, pending invitation, duplicate prevention, direct backend denial, verified activation, no staff Team tab, live open-sheet revocation, retry/signout, existing-account and reset guidance.');
});
