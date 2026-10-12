// Client-side flow helpers. Firestore rules independently enforce every check.
export const OWNER_EMAIL = 'deependrasinghbaghel30@gmail.com';
export const normalizeEmail = value => String(value || '').trim().toLowerCase();

export function accessError(code) {
  return Object.assign(new Error(code), { code });
}

export function verifiedIdentity(user) {
  const email = normalizeEmail(user?.email);
  if (!user?.uid || !email || email.includes('/')) throw accessError('permission-denied');
  if (user.emailVerified !== true) throw accessError('email-not-verified');
  return { email, uid: user.uid };
}

export function hasBoundAccess(user, membership) {
  if (user?.emailVerified !== true || !user.uid || !normalizeEmail(user.email)) return false;
  return membership?.uid === user.uid && membership?.status === 'active';
}

// Existing invitations keep their metadata and can be claimed once. A deleted
// membership is never recreated by an invitee. Only the verified owner can
// bootstrap the owner's own binding, preserving existing owner sign-in.
export function membershipClaim(user, membership) {
  const { email, uid } = verifiedIdentity(user);
  if (!membership) {
    if (email !== OWNER_EMAIL) throw accessError('permission-denied');
    return { uid, status: 'active' };
  }
  if (Object.hasOwn(membership, 'uid')) {
    if (!hasBoundAccess(user, membership)) throw accessError('permission-denied');
    return null;
  }
  if (Object.hasOwn(membership, 'status') && membership.status !== 'pending') {
    throw accessError('permission-denied');
  }
  return { uid, status: 'active' };
}
