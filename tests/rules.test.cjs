const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, setDoc, updateDoc, deleteDoc, getDoc, getDocs, serverTimestamp } = require('firebase/firestore');
const OWNER = 'deependrasinghbaghel30@gmail.com';
let env;
const ctx = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const claim = uid => ({ uid, status: 'active', claimedAt: serverTimestamp() });
const invite = () => ({ addedBy: OWNER, at: serverTimestamp(), status: 'pending' });
const member = (db, email) => doc(db, 'admins', email);
const product = db => doc(db, 'products', 'test-product');
async function seed(email, data) {
  await env.withSecurityRulesDisabled(async c => setDoc(member(c.firestore(), email), data));
}
async function owner() {
  const db = ctx('owner-uid', OWNER);
  await setDoc(member(db, OWNER), claim('owner-uid'));
  return db;
}
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-sr-handicraft', firestore: {
    host: '127.0.0.1', port: 8100,
    rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8')
  }});
});
after(async () => { if (env) await env.cleanup(); });
beforeEach(async () => env.clearFirestore());

test('public reads are preserved; unauthenticated writes and admin reads denied', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(product(db)));
  await assertSucceeds(getDoc(doc(db, 'site', 'config')));
  await assertFails(setDoc(product(db), { name: 'tampered' }));
  await assertFails(getDocs(collection(db, 'admins')));
});
test('unverified invited email cannot read invite, claim it, or write content', async () => {
  await seed('staff@example.com', { addedBy: OWNER, status: 'pending' });
  const db = ctx('attacker', 'staff@example.com', false);
  await assertFails(getDoc(member(db, 'staff@example.com')));
  await assertFails(updateDoc(member(db, 'staff@example.com'), claim('attacker')));
  await assertFails(setDoc(product(db), { name: 'tampered' }));
});
test('unverified owner cannot bootstrap or write; verified owner bootstraps and keeps access', async () => {
  const unverified = ctx('owner-uid', OWNER, false);
  await assertFails(setDoc(member(unverified, OWNER), claim('owner-uid')));
  await assertFails(setDoc(product(unverified), { name: 'tampered' }));
  const db = await owner();
  await assertSucceeds(setDoc(product(db), { name: 'Owner product' }));
  await assertSucceeds(getDocs(collection(db, 'admins')));
  await assertSucceeds(setDoc(member(db, 'staff@example.com'), invite()));
  await assertFails(deleteDoc(member(db, OWNER)));
  await assertFails(updateDoc(member(db, OWNER), { uid: 'replacement' }));
});
test('verified pending invitation claims exactly own UID and gets content access', async () => {
  const ownerDb = await owner();
  await setDoc(member(ownerDb, 'staff@example.com'), invite());
  const db = ctx('staff-uid', 'staff@example.com');
  await assertSucceeds(getDoc(member(db, 'staff@example.com')));
  await assertFails(setDoc(product(db), { name: 'before claim' }));
  await assertFails(updateDoc(member(db, 'staff@example.com'), claim('other-uid')));
  await assertSucceeds(updateDoc(member(db, 'staff@example.com'), claim('staff-uid')));
  await assertSucceeds(setDoc(product(db), { name: 'after claim' }));
  await assertSucceeds(setDoc(doc(db, 'site', 'config'), { title: 'Site' }));
  await assertFails(getDocs(collection(db, 'admins')));
  await assertFails(setDoc(member(db, 'another@example.com'), invite()));
});
test('legacy owner and legacy staff migrate without losing invitation metadata', async () => {
  await seed(OWNER, { addedBy: OWNER, at: 'legacy' });
  const ownerDb = ctx('original-owner', OWNER);
  await assertSucceeds(updateDoc(member(ownerDb, OWNER), claim('original-owner')));
  await assertSucceeds(setDoc(product(ownerDb), { name: 'Owner' }));
  await seed('legacy@example.com', { addedBy: OWNER, at: 'legacy' });
  const db = ctx('legacy-staff', 'legacy@example.com');
  await assertFails(updateDoc(member(db, 'legacy@example.com'), { ...claim('legacy-staff'), addedBy: 'attacker' }));
  await assertSucceeds(updateDoc(member(db, 'legacy@example.com'), claim('legacy-staff')));
  assert.equal((await getDoc(member(db, 'legacy@example.com'))).data().at, 'legacy');
  await assertSucceeds(setDoc(product(db), { name: 'Migrated' }));
});
test('email reassignment, email changes and claim rewrites do not transfer access', async () => {
  await seed('staff@example.com', { uid: 'original-staff', status: 'active' });
  const reassigned = ctx('new-staff', 'staff@example.com');
  await assertFails(setDoc(product(reassigned), { name: 'reassigned' }));
  await assertFails(updateDoc(member(reassigned, 'staff@example.com'), claim('new-staff')));
  const changed = ctx('original-staff', 'changed@example.com');
  await assertFails(setDoc(product(changed), { name: 'changed email' }));
  const original = ctx('original-staff', 'staff@example.com');
  await assertFails(updateDoc(member(original, 'staff@example.com'), { uid: 'new-staff' }));
});
test('revocation takes effect immediately for the same signed-in UID; only explicit reinvite permits new claim', async () => {
  const ownerDb = await owner();
  await seed('staff@example.com', { uid: 'old-staff', status: 'active' });
  const db = ctx('old-staff', 'staff@example.com');
  await assertSucceeds(setDoc(product(db), { name: 'before revoke' }));
  await deleteDoc(member(ownerDb, 'staff@example.com'));
  await assertFails(setDoc(product(db), { name: 'after revoke' }));
  await assertFails(setDoc(member(db, 'staff@example.com'), claim('old-staff')));
  await setDoc(member(ownerDb, 'staff@example.com'), invite());
  const replacement = ctx('new-staff', 'staff@example.com');
  await assertSucceeds(updateDoc(member(replacement, 'staff@example.com'), claim('new-staff')));
  await assertFails(setDoc(product(db), { name: 'stale UID' }));
  await assertSucceeds(setDoc(product(replacement), { name: 'new UID' }));
});
test('owner binding is immutable even to another verified account using owner email', async () => {
  await owner();
  const impostor = ctx('new-owner-uid', OWNER);
  await assertFails(setDoc(member(impostor, OWNER), claim('new-owner-uid')));
  await assertFails(deleteDoc(member(impostor, OWNER)));
  await assertFails(setDoc(product(impostor), { name: 'owner impersonation' }));
});
test('owner cannot pre-bind invitation, overwrite a claimed UID, or alter legacy invite while claiming', async () => {
  const db = await owner();
  await assertFails(setDoc(member(db, 'staff@example.com'), { ...invite(), uid: 'attacker' }));
  await seed('staff@example.com', { uid: 'staff-uid', status: 'active' });
  await assertFails(updateDoc(member(db, 'staff@example.com'), { uid: 'replacement' }));
});
test('verified uninvited account cannot create membership; mixed-case tokens resolve same existing membership', async () => {
  const db = ctx('uninvited', 'nobody@example.com');
  await assertFails(setDoc(member(db, 'nobody@example.com'), claim('uninvited')));
  await assertFails(setDoc(product(db), { name: 'uninvited' }));
  await seed('staff@example.com', { uid: 'staff-uid', status: 'active' });
  const mixed = ctx('staff-uid', 'Staff@Example.com');
  await assertSucceeds(setDoc(product(mixed), { name: 'normalized' }));
});
