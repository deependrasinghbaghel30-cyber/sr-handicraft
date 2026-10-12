import test from 'node:test';
import assert from 'node:assert/strict';
import { membershipClaim, hasBoundAccess, OWNER_EMAIL, normalizeEmail } from '../admin-access.mjs';
const user = (email, uid = 'staff-1', emailVerified = true) => ({ email, uid, emailVerified });
const pending = { addedBy: OWNER_EMAIL, status: 'pending' };
test('unverified invited email and unverified owner cannot claim', () => {
  for (const [email, invitation] of [['staff@example.com', pending], [OWNER_EMAIL, null]]) {
    assert.throws(() => membershipClaim(user(email, 'attacker', false), invitation), { code: 'email-not-verified' });
  }
});
test('verified invited mailbox claims own immutable UID', () => {
  assert.deepEqual(membershipClaim(user('staff@example.com'), pending), { uid: 'staff-1', status: 'active' });
});
test('legacy owner and staff migrate after verification, owner bootstraps safely', () => {
  assert.deepEqual(membershipClaim(user(OWNER_EMAIL, 'owner-1'), null), { uid: 'owner-1', status: 'active' });
  assert.deepEqual(membershipClaim(user(OWNER_EMAIL, 'owner-1'), { addedBy: 'old-owner', at: 1 }), { uid: 'owner-1', status: 'active' });
  assert.deepEqual(membershipClaim(user('staff@example.com'), { addedBy: OWNER_EMAIL, at: 1 }), { uid: 'staff-1', status: 'active' });
});
test('different UID using reassigned email cannot claim existing membership', () => {
  assert.throws(() => membershipClaim(user('staff@example.com', 'replacement-uid'), { ...pending, uid: 'staff-1', status: 'active' }), { code: 'permission-denied' });
});
test('revoked, malformed and already bound invitations fail closed', () => {
  const staff = user('staff@example.com');
  for (const member of [null, { uid: null }, { uid: '' }, { status: 'revoked' }, { uid: 'staff-1', status: 'pending' }]) {
    assert.throws(() => membershipClaim(staff, member), { code: 'permission-denied' });
  }
  assert.equal(membershipClaim(staff, { uid: 'staff-1', status: 'active' }), null);
  assert.equal(hasBoundAccess({ ...staff, emailVerified: 'true' }, { uid: 'staff-1', status: 'active' }), false);
});
test('normalization and missing identity cannot bypass verification', () => {
  assert.equal(normalizeEmail('  Staff@Example.COM '), 'staff@example.com');
  for (const value of [null, {}, user(''), user('staff@example.com', ''), user('staff/name@example.com')]) {
    assert.throws(() => membershipClaim(value, pending), { code: 'permission-denied' });
  }
});
