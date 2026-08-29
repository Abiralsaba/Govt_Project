# React admission/application and payment-return verification report

Verified 2026-08-29 against `central_govt_db_test`. No schema, callback, or
payment backend behavior was changed.

## Passed React/API scope

- React owns the public admission list, type/text filters, details links,
  roll/year application lookup, HSC eligibility, exact Draft application
  payload, server-owned application status display, and all existing query
  combinations (`id`, `view`, `continue`, `success`, `error`, `cancelled`, and
  `applicationId`).
- Returned text is rendered as text. Loading, empty, error, success, duplicate
  UI submission, duplicate API application, invalid input, eligible, and
  existing-application states were exercised.
- A synthetic future admission/HSC fixture verified the complete non-payment
  workflow. Creation remained `Draft` / `Pending`; no test claimed that funds
  were received.
- Existing seeded admission posts are marked Active but all sampled deadlines
  are in 2024, so current applications against them are rejected as expired.
  This is a pre-existing reference-data limitation; no dates were silently
  changed. The synthetic test fixture was removed.

## Failed security audits

- Public application detail returned parent names, phone, email, and address.
- Public roll/year lookup returned the matching application/payment state.
- An unauthenticated synthetic callback with arbitrary `value_a`, `tran_id`,
  `val_id`, and card type changed Draft/Pending to Submitted/Paid and returned a
  success redirect. The marker was removed.
- The legacy apply page shows a success container after gateway initialization
  failure even though the database application is still unpaid.

## Required payment correction — approval needed before backend change

The callback must not use `value_a` as payment proof. A safe design needs:

1. A server-generated, unique transaction record linked to one application,
   expected amount/currency, sandbox/live environment, and Pending state before
   redirecting to SSLCommerz.
2. Server-to-server validation of `val_id`/transaction with SSLCommerz, including
   validation status, amount, currency, store identity, and application mapping.
3. One atomic, idempotent transition from Pending to Paid/Submitted. Replays,
   mismatches, unknown transactions, and already-final states must not mutate the
   application.
4. Audited failure/IPN behavior and a return page that reads server-owned status
   rather than trusting query parameters.
5. An applicant access decision for HSC verification, Draft creation, application
   detail, and roll/year lookup before exposing identity/contact data.

This is a security-sensitive backend/schema design change and was not applied.
No external sandbox session was initiated because it would return through the
known-insecure callback. React exposes no payment button and does not fake a
successful payment.

## Verification totals

- Production build: passed.
- React suite: 11 files, 64 tests passed.
- API/database suite: 44 tests passed.
- Focused admission React cases: 6 passed.
- Focused admission API cases: 5 passed.
- Direct navigation/refresh: passed twice for both built routes; Express rollback
  remained active.

Legacy files and uploads remain untouched. Default `npm start` remains legacy.
No deployment or production-readiness claim is authorized.
