# React admin migration — Health domain

Verified on 2026-08-29 against `central_govt_db_test`. `/admin-health.html` is
active only in opt-in React mode; default `npm start` and all legacy files remain
unchanged for rollback. This is not a production-readiness statement.

## Implemented scope

- Admin dashboard statistics.
- Health-card, vaccination, appointment, ambulance, and complaint queues with
  installed status enums, server filters, safe detail review, and selected-id
  updates.
- All backend update fields are prefilled and resubmitted so a status-only edit
  does not accidentally clear existing clinician/dispatch metadata.
- Hospital listing/add/edit/delete preserves every active route field. Delete
  requires an explicit browser confirmation naming the selected hospital.
- Literal `.html` query state preserves `section`, `status`, `search`, `date`,
  and client `page`; each returned queue is paged in 15-row views.
- All requests use `audience:'admin'`; no legacy script or raw HTML rendering is
  used in the React-owned page.

## Actual verification

- Vite production build passed.
- Six focused React cases plus the admin route guard passed: loading, empty,
  error, unauthorized redirect, success, safe text/XSS, exact request body,
  duplicate submission, pagination/filter state, hospital targeting/confirmation,
  enum/query contracts, and logout.
- Isolated API regression passed for all five domains plus hospitals. Missing,
  citizen, and `isAdmin:false` tokens were denied. Each marker A update left B
  unchanged; filters/details and hospital update/delete selected only the stated
  numeric id. All synthetic records were removed.
- Direct navigation and refresh passed twice through React-mode Express at an
  appointment URL containing every supported query key.

The first API run failed because a synthetic card number exceeded the installed
`VARCHAR(20)`; the corrected schema-compatible fixture passed. The first React
run also failed because the assertion searched for a detail-only name in the
summary row; the corrected test opens the detail before checking it. Neither
failed run is counted as a product pass.

## Remaining backend limitations

- All reviewed update routes and hospital deletion report success without
  checking whether an id matched. The test reproduced HTTP 200 for unknown ids.
- Status values are constrained by MySQL enums but legal transitions from the
  current state are not enforced by the server.
- These mutations do not write a dedicated admin actor/action audit trail.
- Queue endpoints return the full matching dataset and provide no server-side
  pagination; React pagination applies to the returned set.

These limitations remain in the security tracker and prevent a whole-admin or
production-readiness claim, but did not require changing the preserved API.
