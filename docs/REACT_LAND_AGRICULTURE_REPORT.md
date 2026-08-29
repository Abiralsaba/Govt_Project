# React land/agriculture verification report

Verified 2026-08-29 against `central_govt_db_test`. No schema or backend
business behavior was changed in this batch.

## Land — passed React scope

- React owns overview, land-record creation/listing, mutation submission, and
  tracking-status UI. JSON field names, location IDs, buyer NID, and `.html`
  query strings are preserved.
- Exact record and mutation payloads were exercised. Land-record lists remained
  owner-scoped between Alice and Bob. Invalid or repeated UI submissions are
  locked without legacy scripts.
- Loading, empty, database-error, unauthorized routing, success, and stored-text
  rendering states passed. React does not treat `status=success` or `tid` as
  payment proof.
- The built `/land.html?status=success&tid=UNVERIFIED` route passed direct
  navigation and refresh twice through Vite preview.

## Land — blocked and failed audits

- Payment initiation is intentionally absent from the React implementation.
  The active success route accepts an unauthenticated URL-selected transaction
  and changes it to `Success` without SSLCommerz validation. An isolated marker
  row reproduced this (HTTP 302, database status changed to `Success`) and was
  removed.
- Mutation tracking returned Bob's full marker row and buyer NID to Alice using
  only the tracking value. The marker row was removed.
- Because payment return behavior cannot be preserved securely without a new
  callback design, `/land.html` is not in the Express React allow-list; the
  unchanged legacy page remains the rollback/active route.

## Agriculture — passed citizen scope

- React owns overview/activity, geolocation-backed six-day Open-Meteo forecast,
  subsidies, crop reports, expert questions, farmer market listings, and
  training programmes/registrations.
- Active API field names and status values are preserved. Exact subsidy, crop,
  expert, listing, and training operations were executed with synthetic data.
- Alice's records did not appear in Bob's citizen lists. A repeated training
  registration was rejected, and Pending/Registered states remained explicit.
- React renders farmer/product/API text as text. Loading, empty, error,
  unauthorized, and success states passed.
- `/agriculture.html?tab=market&status=Pending` passed direct navigation and
  refresh twice through React-mode Express. Authenticated representative reads
  returned HTTP 200; the same protected stats request without a token returned
  HTTP 403.

## Agriculture — failed security audits

- An ordinary citizen token received HTTP 200 from the agriculture admin update
  and changed a subsidy from `Pending` to `Approved`.
- Public market browsing returned a Pending listing and its phone number without
  authentication.

These are tracked security issues, not passed compatibility checks. The citizen
React page is enabled locally, but agriculture admin migration and public
deployment remain blocked.

## Verification totals

- Production build: passed.
- React suite: 9 files, 48 tests passed.
- API/database suite: 34 tests passed.
- Focused land/agriculture React cases: 7 passed, plus 2 route guards.
- Focused land/agriculture API cases: 5 passed.
- Failed security audits: 4, all documented above and in the security tracker.

Legacy files and uploads remain untouched. Default `npm start` remains legacy.
No deployment or production-readiness claim is authorized.
