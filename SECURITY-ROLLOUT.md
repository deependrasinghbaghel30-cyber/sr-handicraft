# Verified staff invitation rollout

## Scope and source

Based on production and `main` commit `aa8cb41cfe3a7788306d7f97822bb45b2bbf4d07`, verified on 2026-10-12. This is a static website. The Firebase web configuration is public; the enforcement boundary is Firestore Security Rules.

Changed application files: `admin.html`, `admin-access.mjs`, and `firestore.rules`. The public catalogue and product data are unchanged. `firebase.json` and `tests/` provide local-only verification tooling.

## Access model

- A Firebase sign-in is insufficient. Every protected content write requires a verified email and an active membership bound to the current Firebase UID.
- The owner records a pending email invitation only. The invited person chooses their own password, or signs in to their existing account, and verifies their email.
- The first verified claim binds the existing invitation to that UID in a transaction. It cannot change invitation metadata, choose a different UID, or overwrite a prior binding.
- Existing email-only staff memberships migrate on their next verified sign-in. Their original invitation metadata stays intact.
- The original owner can claim the existing legacy owner record, or create the owner binding if it is absent, only after verifying the original owner email. The owner binding cannot be deleted or reassigned from the admin UI or by client rules.
- Deleting a staff membership revokes writes immediately. An owner must explicitly remove access and create a new pending invitation to permit a replacement account. The old UID no longer works after the replacement claim.
- A different UID with a reused email, or the old UID with a changed email, does not inherit access.
- Team listing and management are owner-only. The public product/site reads stay public, as before.

## Deployment dependency and owner safety

Publishing the website alone does **not** close direct Firebase access. Vercel does not apply `firestore.rules`. Applying live Firestore rules is a separate security-policy change that requires explicit authorization; it was not performed as part of this local patch.

1. Before the live policy change, confirm the existing owner can sign in/recover their account and receive the owner verification email. Do not reset their password, delete their Auth account, or change their UID as part of this rollout.
2. Coordinate the new admin UI and matching Firestore rules in one short rollout window. The UI can be published first, but unbound staff may be unable to activate until the rules are applied. Old clients need a refresh after the rules change. Public catalogue reads continue during this window.
3. After the explicitly authorized policy deployment, use the existing owner account to complete verification if needed. The UI automatically binds that same account and preserves legacy metadata. Verify owner Team access and a legitimate invited account.
4. Do not claim the direct-access vulnerability is fixed until the deployed rules match this file. Check live policy version and authorized smoke-test results independently of website deployment status.
5. If the owner no longer controls the original mailbox or has already replaced their Auth UID, stop and plan account recovery with the owner. Do not weaken verification or silently delete/rebind the owner record. Any exceptional administrative recovery is a separate security-sensitive action.

No production Auth accounts, credentials, membership documents or security rules were modified by these tests. Auth tests use the demo project `demo-sr-handicraft`; emulator mode is restricted to `127.0.0.1?emu`. Normal production browsing always uses the original production Firebase configuration.

## Checks

From the `tests` directory, install the pinned test dependencies with `npm install`. Java 21 and Node 22+ are recommended for this tested toolchain. Run:

- `npm test`: 6 pure identity/claim tests.
- `npm run test:rules`: 10 real Firestore-emulator tests, including owner migration, staff claim, malformed/unauthorized claims, reassignment, revocation and public reads.
- `npm run test:dom`: the actual admin application handlers executed with JSDOM and real Auth/Firestore emulators. Covers verification emails and tokens, owner legacy migration, pending invitations, duplicate prevention, unverified direct-write rejection, verified activation, live revocation with an open editor, retry/sign-out, existing-account and reset guidance.
- `npm run test:browser`: a full Chromium flow using the production Firebase 10.12.2 browser SDK, served from an official-source local cache. Install Chromium with `npx playwright install chromium` or supply `CHROMIUM_PATH`. This test blocks production-service requests. It was attempted here but could not run because the execution environment rejects Chromium Unix sockets (`Operation not permitted`). It is supplied for execution in a browser-capable environment; no browser visual-QA pass is claimed.

Successful local results: 6/6 pure tests, 10/10 Firestore rules tests, and the end-to-end DOM/Auth/Firestore integration scenario. JavaScript syntax and patch whitespace checks also pass. No production penetration test or policy deployment was performed.

Official Firebase references:
- https://firebase.google.com/docs/reference/rules/rules.firestore.Request
- https://firebase.google.com/docs/auth/web/manage-users
- https://firebase.google.com/docs/rules/unit-tests
