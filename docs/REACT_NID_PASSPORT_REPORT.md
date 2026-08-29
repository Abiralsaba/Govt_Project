# React NID/passport verification report

Verified 2026-08-29 against `central_govt_db_test`. No schema or backend
business behavior was changed in this batch.

## NID — passed React/API scope

- React owns dashboard, profile, correction, reissue, smart card, address
  change, verification, appointments, family, combined application tracking,
  centers, and fees. No legacy page or script controls React markup.
- Installed enum meanings are used for correction category, reissue reason,
  card type, verification type, appointment type, and family relation. This
  avoids legacy choices that the authoritative installed tables reject; no SQL
  defaults or schema meanings were changed.
- Multipart names are preserved for profile (`photo`, `signature`), corrections
  (`documents`), reissue (`gd_document`, `damaged_photo`), and address proof
  (`proof_document`). Address ID fields are sent with the route-supported legacy
  aliases.
- Test-database requests preserved `Submitted` status and owner-scoped histories.
  Smart card/application tracking, appointments, family reads, and deletes were
  isolated between Alice and Bob. Cross-owner delete returned the legacy HTTP
  200 but did not remove the selected citizen's row.
- Invalid executable uploads were rejected by the Multer filter without a file
  being created. Successful public-directory upload writes were not performed
  because upload privacy/storage is an unresolved critical issue.

## NID — failed/blocked

- Public NID+DOB verification returned the synthetic name and photo path.
- Bob's citizen token queried Alice's NID and received parent and blood-group
  fields.
- The profile backend accepts `photo`/`signature` but never persists `req.files`.
  React warns about the limitation and does not claim upload success semantics.

The built NID route passed direct navigation and refresh twice with
`section`/`ref` query parameters. Express continues to serve legacy NID.

## Passport — passed React/API scope

- React owns overview, full application, seven document fields, citizen
  application list/detail/cancellation, tracking, official fees/calculator, and
  office directory.
- Active JSON names, location-name values, application numbers, query strings,
  status values, and multipart names are preserved. A second active application
  was rejected.
- Application list/detail/track/upload/cancel operations remained owner-scoped.
  Cancellation changed only Alice's selected row; Bob's row stayed `Submitted`.
- Invalid executable uploads were rejected without a disk write. Empty upload
  returned HTTP 400 for the owner and HTTP 404 cross-owner.
- `status`/`tid` query parameters are retained but rendered only as unverified.
  React exposes no payment initiation or manual-payment action.

## Passport — failed/blocked

- Bob submitted an application using Alice's NID because the route does not bind
  `nid_number` to the authenticated identity.
- Sandbox init returned HTTP 500: the active route updates a missing
  `passport_applications.transaction_id` column. The public callback has the
  same missing-column failure and redirected to `status=error`.
- The separate authenticated manual endpoint accepted a synthetic transaction
  string and changed the application to `Paid` / `Payment Verified`.

The built passport route passed direct navigation and refresh twice with
payment-return parameters. Express continues to serve legacy passport. No
successful payment was faked and no external gateway call occurred.

## Verification totals

- Production build: passed.
- React suite: 10 files, 58 tests passed.
- API/database suite: 39 tests passed.
- Focused NID/passport React cases: 8 passed, plus 2 route guards.
- Focused NID/passport API cases: 5 passed.
- Failed security/compatibility audits: 5 findings, documented above and in the
  security tracker.

Legacy files and uploads remain untouched. Default `npm start` remains legacy.
No deployment or production-readiness claim is authorized.
