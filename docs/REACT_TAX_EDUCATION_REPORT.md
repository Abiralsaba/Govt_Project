# React tax/education verification report

Verified 2026-08-28 against `central_govt_db_test`. No schema or backend behavior
was changed in this batch.

## Tax — passed

- React owns dashboard, TIN status/application, e-return filing/history, the
  legacy 2025–26 calculator, pending payment recording/history, challan
  generation/history, VAT status/application, notices, and tax zones.
- The active JSON field names and statuses are preserved. Payment submissions
  are described as claims recorded `Pending`; the generated receipt is not
  presented as proof that funds were received. Challans remain `Generated`.
- Duplicate active TIN and VAT applications were rejected. Returns, payments,
  VAT/TIN status, challans, and notices remained scoped to the authenticated
  synthetic citizen. Bob could not change Alice's notice status; Alice could.
- The representative return calculation produced total income `1,000,000`,
  taxable income `950,000`, tax on income `60,000`, net tax `45,000`, and tax due
  `30,000`, matching the active route logic.

## Tax — failed direct-API audit

`POST /api/tax/payments/pay` accepts an optional `return_id` without proving the
return belongs to `req.user.id`. Bob's synthetic token created a `Pending`
payment row linked to Alice's synthetic return. The generated rows were removed.
The legacy form omits `return_id`, and React preserves that active payload, but
the direct endpoint needs an ownership check before deployment.

## Education — passed

- React owns JSC/SSC/HSC result lookup/rendering and the complete stipend list,
  application, history, eligibility, duplicate-prevention, and `Submitted`
  lifecycle used by the legacy page.
- Result URLs retain the exact
  `/api/education/results/:examType/:year/:roll` contract. Valid, invalid-exam,
  and missing-result cases were executed.
- The nested stipend payload (`stipendId`, `studentDetails`, `financialInfo`,
  `guardianInfo`, `bankDetails`) is unchanged. Cross-user application lists were
  isolated and repeat application was rejected.
- React renders returned identity/result text without HTML interpretation.

## Security limitation

Education result endpoints are public and return student/parent/institution
identity fields from a guessable exam/year/roll path. The React page retains the
legacy citizen guard, but the API itself is unauthenticated. Whether these fields
are intentionally public requires a separate privacy and access decision.

## Verification totals

- Production build: passed.
- React suite: 8 files, 39 tests passed.
- API/database suite: 29 tests passed.
- `/tax.html` and `/education.html` direct navigation and refresh passed twice
  with section and unrelated query parameters intact.

Legacy files and uploads remain untouched. No deployment is authorized.
