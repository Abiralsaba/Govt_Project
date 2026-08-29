# React health/water verification report

Verified 2026-08-28 against `central_govt_db_test`. No schema or backend behavior
was changed in this batch.

## Health — passed

- React owns health overview, card application/history, vaccination registration
  and history, hospital directory/filtering, appointment booking/history/cancel,
  ambulance request/history, and complaint submission/history.
- Existing JSON property names, nullable-field behavior, authenticated endpoints,
  literal `/health.html` URL, and query strings are preserved.
- The API rejected a second active health-card application, kept cards and lists
  isolated between the two synthetic citizens, and denied Bob's attempt to
  cancel Alice's pending appointment.
- Loading, empty, error, unauthorized, success, safe-text, and duplicate-submit
  UI checks passed. Direct navigation and refresh passed in React-mode Express.

## Health — failed pre-existing API audit

`POST /api/health/vaccination/register` accepts an optional `health_card_id`
without proving the card belongs to `req.user.id`. Alice's synthetic token was
able to create a vaccination linked to Bob's synthetic health card. The audit
rows were removed. Neither the legacy form nor the React form sends this field,
so the migrated active form does not expose it, but the endpoint remains unsafe
for direct callers and production deployment.

## Water — passed

- React owns the overview, connection application/history, read-only bill
  history, water-quality submission/history, complaint submission/history, and
  project directory/filtering.
- Existing non-payment JSON contracts and owner-scoped list behavior passed.
  Loading, empty, error, unauthorized, success, duplicate-submit, and safe React
  rendering checks passed.
- The built `/water.html` React route accepts direct navigation, refresh, section
  queries, and unrelated query parameters through Vite preview.

## Water — blocked and failed

The active `POST /api/water/bill/pay` handler:

- accepts client-supplied amount, surcharge, total, method, and transaction id;
- looks up a connection number without constraining it to `req.user.id`; and
- inserts `status = 'Paid'` and `paid_date = NOW()` without external payment
  verification.

An isolated audit proved Bob could submit a `৳1` paid record linked to Alice's
connection. The generated payment and connection were removed afterward. React
therefore shows existing bill history but offers no bill-submission control.
Express continues to serve the legacy `/water.html` page until a verified bill
source/payment design and owner check are approved.

## Verification totals at this batch

- React production build: passed.
- React focused/full suite: 7 files, 30 tests passed.
- API/database suite: 23 tests passed (13 baseline, 5 Batch 1, 5 health/water).

Legacy files and uploads remain untouched. No deployment is authorized.
