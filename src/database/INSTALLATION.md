# NationX database installation baseline

This installation is local-development only. It does not establish production
readiness. The installer accepts only `central_govt_db_test` and
`central_govt_db`; automated reset is hard-blocked for every database except
`central_govt_db_test`.

## SQL inventory and authority

`schema_full.sql` is the authoritative **core structural dump**. It is the only
repository dump generated from the integrated database, is named as the first
installation step in the project documentation, and establishes the shared
identity, geography, service, land, document, shop, and support tables. It is
not chosen because it has the most definitions: later domain schemas remain
authoritative for their own modules.

| SQL file | Classification and installation role |
|---|---|
| `schema_full.sql` | Full integrated core dump; install first. |
| `nid_schema.sql` | NID domain extension. |
| `passport_schema.sql` | Passport domain replacement/extension; its hard-coded `USE central_govt_db` is stripped in memory by the allowlisted installer. |
| `health_schema.sql` | Health domain replacement. |
| `water_schema.sql` | Water domain replacement. |
| `nbr_schema.sql` | NBR/tax domain extension and reference seed. |
| `agriculture_schema.sql` | Later agriculture domain schema; migration 001 lets it replace two stale core definitions. |
| `education_schema.sql` | Education domain schema and demonstration results. |
| `education_institutions.sql` | Education institution table and reference seed required by later views. |
| `university_admission_schema.sql` | University admission domain schema and reference seed. |
| `market_schema.sql` | Market-price domain schema and reference seed. |
| `shop_schema.sql` | Shop domain schema; `addto_cart` is the active cart table. |
| `notices_schema.sql` | Notice domain replacement and demonstration notices. |
| `stipend_schema.sql` | Authoritative stipend tables, lifecycle enum, and reference seed. |
| `admin_schema.sql` | Admin domain definition; migration 002 adds the active `nid` contract when the core table already exists. |
| `contact_schema.sql` | Contact domain extension. |
| `land_mutation_schema.sql` | Earlier land domain definition; retained in sequence as a no-op where the core table already exists. |
| `schema_normalized.sql` | Normalization/index patch applied after domain schemas. |
| `views.sql` | Integrated analytical views. |
| `triggers.sql` | Integrated trigger bundle. Corrected land-related triggers are replaced by migration 003. |
| `procedures.sql` | Documented four-procedure bundle. Its land routine is replaced by migration 004. |
| `land_mutation_trigger.sql` | Original documented ownership trigger, replaced in-place by versioned migration 003 after installation. |
| `schema_logging.sql` | Older admin-login table initializer; excluded because the core dump already has the active compatible table. |
| `schema_logs.sql` | Older citizen-login table initializer; excluded because it cannot upgrade the existing core table and is not in the documented sequence. |
| `stored_procedures.sql` | Deferred routine bundle; not in the documented installation order and contains unresolved references and delimiter/semantic drift. |
| `complex_queries.sql` | Query catalogue/report examples, not an installation migration. |

Git history supports this division: the integrated core dump and documented
sequence predate later domain commits; the March procedure catalogue was added
later without being added to the installation instructions. No numbered legacy
migration chain exists in the repository.

## Executed sequence

The installer executes:

1. `schema_full.sql`
2. migrations 000, 001, and 002
3. synthetic identities (needed before the notice seed's admin FK)
4. domain schemas in the order listed above
5. normalization, views, and integrated triggers
6. the original land trigger followed by migration 003; documented procedures
   and migration 004 install only when the host routine metadata is compatible,
   otherwise migration 005 records their explicit deferral
7. explicitly labelled synthetic demonstration data
8. schema, FK, migration, trigger, collation, and seed validation

All source SQL is read and sent to the MySQL client through standard input.
Database-selection/creation/removal statements inside source SQL are removed in
memory and every script is prefixed with the allowlisted target. Credentials are
loaded from `.env`, passed without command-line password arguments, never logged,
and never exposed to frontend code.

## Versioned corrections

- `000_core_dump_installability.sql`: records an exact, fail-closed in-memory
  addition of the missing primary key on the stale `water_issues` placeholder;
  the later water domain script drops and replaces that placeholder.
- `001_fresh_install_domain_precedence.sql`: removes only the two stale core
  agriculture tables during a new installation so the later authoritative
  domain schema can create its active definitions.
- `002_backend_contract_compatibility.sql`: adds `admins.nid`, `todos.due_date`,
  `land_mutations_v2.buyer_id → reg_info.id`, and optional
  `landtax.user_id → reg_info.id`; removes the invalid `nid_cards` FK.
- `003_trigger_authoritative_land.sql`: makes the DB trigger the sole land
  transfer authority, locks seller ownership, validates amounts, prevents
  duplicates/over-transfer, requires one exact linked service request, and
  removes land-specific duplicate notification/audit trigger effects.
- `004_land_procedure_trigger_compatibility.sql`: prevents the documented land
  procedure from transferring ownership itself and makes its notification
  writes compatible with the existing message-only notification table. It is
  retained but not applied on a host whose MariaDB routine metadata is broken.
- `005_defer_routines_for_incompatible_server.sql`: records that unused stored
  routines were intentionally not installed because repairing `mysql.proc`
  would modify the server's `mysql` system database outside the authorized
  NationX database scope.

The admin route is responsible for authentication, authorization, transaction
management, mutation status, seller notification, audit entry, and admin-action
log. The trigger performs the ownership transfer and updates exactly one linked
service request. These operations run in the same route transaction, so a
trigger failure rolls back the status change as well.

## Identity and integrity limitations

`nid_cards.citizen_id` originally referenced a removed `citizens` table. There
is no evidence that its IDs are interchangeable with `reg_info.id`. The invalid
FK is therefore removed, `citizen_id` stays nullable, and no remapping is made.
Document lookup currently relates an NID card to a citizen by the unique NID
snapshot. Identity normalization is explicitly incomplete.

Land service requests also have no explicit `mutation_id` FK. The corrected
trigger scopes matching by user, service type, and the exact
`ID: <tracking-number> -` prefix, then requires exactly one pending row. Missing
or duplicate matches abort approval. A future explicit FK would require a
separate approved business-schema migration.

The buyer trigger deliberately rejects a transfer when the buyer already has a
record with the same khatian/dag rather than guessing whether records should be
merged. That case remains a future business-rule decision if it occurs.

## Deferred code

- On the current XAMPP host, all stored routines are deferred because MariaDB
  10.4.28 reports a 20-column `mysql.proc` created by MariaDB 10.1; routine
  creation requires a host-level `mysql_upgrade`. That operation is not
  authorized because it modifies the `mysql` system database. Source inspection
  found no active `CALL` statements.
- `stored_procedures.sql` is not installed. Among other unresolved issues, its
  stipend eligibility routine still references obsolete
  `available_stipends`/`stipends_applications` names. It must be separately
  reviewed and versioned before activation.
- Legacy `/api/departments/land/search`, `/api/departments/land/mutation`, and
  `/api/departments/opt/tin` paths have no active frontend callers and remain
  deferred rather than being represented as verified.
- The old `cart_items` core table is retained for rollback/history;
  `addto_cart` is the active authenticated cart contract.
- No claim is made that all stored routines, legacy routes, or all 364 API
  endpoints work.

## Commands

```bash
# First test installation (fails rather than modifying an existing DB)
npm run db:install:test

# Authorized automated test reset
npm run db:reset:test

# Focused baseline regression suite (hard-coded safety check for test DB)
npm test

# Development installation only after the test gates pass
npm run db:install:dev
```

Local synthetic login accounts:

| Role | Email | Password |
|---|---|---|
| Citizen Alice | `alice.demo@nationx.test` | `NationX-Demo-2026!` |
| Citizen Bob | `bob.demo@nationx.test` | `NationX-Demo-2026!` |
| Approved admin | `admin.demo@nationx.test` | `NationX-Admin-2026!` |

These are explicitly synthetic local accounts and must never be reused for a
public deployment.
