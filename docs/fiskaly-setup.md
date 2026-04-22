# fiskaly KassenSichV setup — step-by-step

This document covers the one-time fiskaly KassenSichV (SIGN DE V2) setup for a Bleiche deployment. It is written from a real end-to-end setup we performed against the sandbox so every step is known to work, and it is the process to follow when switching to a paid **LIVE** account for a real company.

**Before you start** — have these open:

- Your company's legal data (Handelsregister number, VAT ID, address).
- Your company's primary technical email.
- fiskaly's dashboard: https://dashboard.fiskaly.com/
- Their developer reference: https://developer.fiskaly.com/api/kassensichv/v2/ (the OpenAPI spec is in `docs/_spec.json` for offline reference).
- A password manager to store secrets — the `api_secret` and `admin_puk` are each shown **exactly once**.

Everything below happens in the DEMO (sandbox) environment. For production, repeat with the LIVE environment flipped on — the flow is identical.

## 1. Create a fiskaly account

1. Go to **https://dashboard.fiskaly.com/signup**.
2. Use a company email (not a personal one) — fiskaly ties the organization to this address.
3. Verify the email, set a password, log in.
4. You land on the Services / Activate-API screen. Pick **KassenSichV** (also labelled "SIGN DE" or "Cash Register Protection Act DE"). This is Germany's TSE fiscalization API. If your property is in Austria, pick **SIGN AT** instead; the rest of this doc is DE-specific.
5. Fill in the organization form. The sandbox is free; the form answers don't need to be your real registration data while testing, but for the LIVE switch they must be exact.

## 2. Get the API key and secret

These are the two credentials the backend uses to authenticate every request.

1. In the left sidebar, find **API Keys** (also labelled "Credentials"). It may live under the **"TestORG"** (or your org name) dropdown at the top of the sidebar, or under **Developers** → **Management API** at the bottom of the sidebar.
2. Click **Create API Key** (or **New**). Give it a name like `bleiche-prod` or `bleiche-dev`.
3. A dialog appears showing:
   - `api_key` — a string like `test_...` on sandbox, without the `test_` prefix on LIVE.
   - `api_secret` — a longer random string.
4. **Copy the secret now.** fiskaly shows the `api_secret` exactly once. If you miss it, you have to revoke and regenerate.
5. Paste both into your password manager, temporarily, until they land in `backend/.env`.

## 3. Create a TSS

The TSS (Technical Security System) is fiskaly's cloud-signed equivalent of a physical TSE device. One TSS per property is typical; one TSS can serve multiple clients (tills).

1. In the sidebar: **Germany (SIGN DE V2)** → **Technical Security Systems**.
2. Click **CREATE NEW TSS**. (No description is required at creation; you add it later when you initialize.)
3. A confirmation dialog shows two values:
   - `tss_id` — a UUID like `3d2e49be-840e-4bd9-aa43-60a4c99c339c`.
   - `admin_puk` — a 10-digit numeric code (the "PIN unblock key"). **Copy it now.** fiskaly shows it exactly once.
4. Paste both into the password manager. The `admin_puk` is rarely used in daily operation — it is the emergency unlock for the admin PIN after five failed attempts.

Expected state right after creation: **`CREATED`**. The dashboard only lets you download the certificate and (later) update the admin PIN from this page. **State transitions are not exposed in the UI** — you must do them via the API. The next section covers that.

## 4. Initialize the TSS and create a client (via API)

Moving a TSS from `CREATED` → `UNINITIALIZED` → `INITIALIZED`, setting the admin PIN, and creating a client all happen via HTTPS calls. We ship a one-shot Python script that does all of it: `backend/scripts/fiskaly_setup.py`.

### 4a. Pick an admin PIN

Per fiskaly's OpenAPI spec, `AdminPin` must be **at least 6 characters**. Alphanumeric is fine. Choose something memorable but not reused elsewhere. The PIN is required only when performing admin operations (creating additional clients, changing admin PIN, reading TSS audit logs). Regular transaction signing does **not** need the admin to be logged in.

Save the PIN in the password manager next to the `admin_puk`.

### 4b. Run the setup script

From `backend/`, with the venv activated:

```bash
FISKALY_API_KEY="<your api_key>" \
FISKALY_API_SECRET="<your api_secret>" \
FISKALY_TSS_ID="<your tss_id>" \
FISKALY_ADMIN_PUK="<your admin_puk>" \
FISKALY_ADMIN_PIN="<your 6+ char pin>" \
python -m scripts.fiskaly_setup
```

The script does the following, each step visible in its log output:

1. `POST /api/v2/auth` — exchanges the API key/secret for a short-lived access token.
2. `GET /api/v2/tss/{id}` — reads current TSS state (expected: `CREATED`).
3. `PATCH /api/v2/tss/{id}` with `{state: "UNINITIALIZED"}` — advances the TSS from `CREATED` → `UNINITIALIZED`.
4. `PATCH /api/v2/tss/{id}/admin` with `{admin_puk, new_admin_pin}` — sets the admin PIN for the first time using the PUK.
5. `POST /api/v2/tss/{id}/admin/auth` with `{admin_pin}` — opens an admin session on the TSS.
6. `PATCH /api/v2/tss/{id}` with `{state: "INITIALIZED", description}` — finalizes the TSS; it is now ready to sign transactions.
7. `PUT /api/v2/tss/{id}/client/{uuid}` with `{serial_number}` — **still inside the admin session**, registers the first client (cash register). The client UUID is generated by the script; fiskaly stores it and associates future transactions with it.
8. `POST /api/v2/tss/{id}/admin/logout` — closes the admin session.

The script prints the four values you need for `backend/.env`:

```
FISKALY_API_KEY=<api_key>
FISKALY_API_SECRET=<api_secret>
FISKALY_TSS_ID=<tss_id>
FISKALY_CLIENT_ID=<client_id>
FISKALY_API_BASE_URL=https://kassensichv-middleware.fiskaly.com
```

The script is idempotent: re-running it detects the current TSS state and skips completed steps. Creating an additional client (e.g. `restaurant-pos` alongside the existing `reception-pos`) is done by duplicating a copy of the script and changing the serial_number, or by calling `PUT /api/v2/tss/{id}/client/{new-uuid}` manually — fiskaly's hard cap is 199 clients per TSS.

### 4c. Common errors and fixes

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 401 `E_ADMIN_LOGIN_FAILED` with `UNBLOCK_RESULT_ERROR` | Admin PIN is shorter than 6 characters | Use a 6+ character PIN |
| HTTP 401 `E_ADMIN_NOT_AUTHENTICATED` on `PUT /tss/{id}/client/{uuid}` | Admin was logged out before client creation | Create the client **before** `admin/logout` — the script already does this |
| HTTP 400 `` `tx_revision` must be 1 at the start of a transaction`` | Missing or wrong `tx_revision` query parameter on the first PUT of a transaction | Always send `?tx_revision=1` on the ACTIVE PUT, `?tx_revision=2` on the FINISHED PUT — the `FiskalyFiscalizationProvider` already does this |
| Auth works but `GET /tss/{id}` returns 404 | Wrong `tss_id` or wrong API (Austria keys against DE TSS) | Verify which sidebar section the TSS lives in — must be **Germany (SIGN DE V2)** |
| PUK appears already consumed | PUK has been used successfully once to set the PIN | You don't need the PUK again for normal ops; only for emergency unblock after five failed PIN attempts |

## 5. Write credentials into `backend/.env`

Paste these lines, filling in the values from the previous step. **`.env` is gitignored** — never commit it.

```
FISKALY_API_KEY=
FISKALY_API_SECRET=
FISKALY_TSS_ID=
FISKALY_CLIENT_ID=
FISKALY_API_BASE_URL=https://kassensichv-middleware.fiskaly.com
# Keep these two private but available for later client-management or PIN reset
FISKALY_ADMIN_PUK=
FISKALY_ADMIN_PIN=
```

Then restart the backend. On startup the `get_provider()` factory in `backend/app/services/fiscalization/__init__.py` reads the env and chooses the real fiskaly provider automatically. If any of the four required values are missing it silently falls back to the mock signer and logs a warning — so an incomplete paste doesn't 500 every sale.

## 6. Smoke-test a signed transaction

Three ways, from cheapest to most thorough:

**a. Direct provider call.** From `backend/`, with `.env` populated:
```bash
python -c "
import os
for line in open('.env'):
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1); os.environ.setdefault(k.strip(), v.strip())
from app.services.fiscalization import get_provider
from app.services.fiscalization.base import FiscalizationLine, FiscalizationRequest
p = get_provider(); print('provider:', p.name)
r = p.sign(FiscalizationRequest(
    invoice_id=1, invoice_number='TEST-0001', currency='EUR', payment_method='CASH',
    lines=[FiscalizationLine(description='Test', quantity='1', vat_rate='NORMAL',
                             gross_cents=1190, net_cents=1000, vat_cents=190)],
    total_gross_cents=1190, total_vat_cents=190, total_net_cents=1000))
print('tx_num:', r.transaction_number, 'sig_ctr:', r.signature_counter)
print('qr:', r.qr_code_data[:160])"
```
Expected: `provider: fiskaly`, `sig_ctr` is a real integer (increments every transaction on the same TSS), and the QR starts with `V0;<client-serial>;Kassenbeleg-V1;…`.

**b. Through the REST API.**
```bash
# Log in as admin, then:
curl -X POST http://localhost:8000/api/cashier/invoices \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"venue":"restaurant","items":[{"description":"Test","quantity":1,"unit_price_cents":1190,"vat_rate_bp":1900}]}'
# Note the returned `id`, then:
curl -X POST http://localhost:8000/api/cashier/invoices/<id>/finalize \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"payment_method":"cash"}'
```
Response includes `receipt.qr_code_data`, `receipt.signature_counter`, `receipt.provider: "fiskaly"`.

**c. Through the frontend.** Log in, go to **`/cashier`**, add a product from the catalogue, pick a payment method, click **Charge + print**. The resulting `/invoices/:id` screen shows the QR code panel with provider `fiskaly` — no yellow "MOCK" warning.

## 7. Verify in the fiskaly dashboard

Every signed transaction appears in the fiskaly dashboard under **Germany (SIGN DE V2)** → **Transactions**. Useful to confirm:

- The `tss_id`, `client_id`, `number`, and `signature.counter` match what your backend recorded.
- `time_start` and `time_end` are unix-seconds timestamps produced by the TSS, **not** by your server clock. This is what makes KassenSichV tamper-evident.

## 8. Switching to LIVE for a real company

Sandbox keys are prefixed `test_` and go against fiskaly's DEMO environment. Live keys are different credentials generated against a paid plan.

1. **Get a quote.** fiskaly's self-service tier covers small volume (check their current pricing page). For multi-client production use, you typically sign a contract with their sales team (`sales@fiskaly.com`).
2. **Complete legal verification.** fiskaly needs company registration data (Handelsregister-Nummer), VAT ID, legal address, and a responsible technical contact. For audit they also want to know which cash-register software you use — "Bleiche Resort in-house" is acceptable, but describe it.
3. **In the dashboard, click "ENABLE LIVE"** (the button in the top-left of the sidebar, below the org name). This opens a live environment alongside DEMO — they live in the same dashboard but are totally isolated.
4. **Repeat sections 2, 3, 4 of this doc in the LIVE environment.** New API key, new TSS, new admin PIN, new client. Nothing carries over from DEMO.
5. **Update `backend/.env`** with the LIVE credentials. The backend code is **identical** — only the environment values change.
6. **Keep DEMO credentials in a second `.env.demo`** file (or a second deployment) so engineers can keep iterating without risking a real transaction getting signed.
7. **Do NOT re-use the admin PIN from sandbox.** Choose a new PIN for LIVE and record it separately. The `admin_puk` is generated fresh by fiskaly when you create the LIVE TSS.

## 9. Operational notes

- **Transactions are append-only.** fiskaly never lets you delete or rewrite a signed transaction. If a sale is wrong, cancel via a compensating transaction (`receipt_type: "CANCELLATION"` in the schema). Our backend currently doesn't wire up cancellation — it's in the deferred v2 list in `docs/cashier.md`.
- **Back up the admin PIN and PUK separately.** Losing the PIN and exceeding five failed login attempts locks the TSS admin until you unblock with the PUK. Losing both means contacting fiskaly support and identity-verifying to restore access.
- **Signature counter should be monotonic.** If `signature_counter` goes backwards or skips a large range for one TSS, something is wrong — each transaction must increment it by 1.
- **Rotate API keys annually** or when a staff member with access leaves. fiskaly lets you create a new key pair and revoke the old one from the dashboard.
- **Export compliance data periodically.** fiskaly exposes an export endpoint; we have not wired it into the backend yet but should before audit time.

## 10. What's in the repo

- `backend/app/services/fiscalization/base.py` — provider protocol
- `backend/app/services/fiscalization/fiskaly.py` — real fiskaly provider (auth caching, two-step ACTIVE→FINISHED tx, VAT-rate mapping)
- `backend/app/services/fiscalization/mock.py` — deterministic fallback (never use in production — its "signatures" are SHA digests, not TSE signatures)
- `backend/app/services/fiscalization/__init__.py` — `get_provider()` factory that reads env
- `backend/scripts/fiskaly_setup.py` — the one-shot setup script described in section 4
- `backend/app/routers/cashier.py` — `/api/cashier/*` endpoints that call the provider
- `docs/cashier.md` — cashier / POS data model and endpoints
- `docs/_spec.json` — fiskaly v2 OpenAPI spec, kept in the repo for offline reference

## 11. Glossary

- **TSS** — Technical Security System. fiskaly's cloud equivalent of the physical TSE module required by KassenSichV.
- **TSE** — Technische Sicherheitseinrichtung, the hardware security device the German law was originally written for. fiskaly abstracts it behind an HTTPS API.
- **KassenSichV** — Kassensicherungsverordnung, the 2020 German cash-register regulation that mandates signed transactions.
- **Client** — a registered cash register (physical or virtual). A TSS can host up to 199.
- **Transaction** — one signed event (typically one receipt). Has an `ACTIVE` state (started) and a `FINISHED` state (closed and signed). KassenSichV requires both a signed start- and end-time so fake-after-the-fact receipts are detectable.
- **Signature counter** — incremented by 1 for every signature the TSS produces. A gap or reset indicates tampering.
- **Admin PUK** — 10-digit unblock code issued by fiskaly on TSS creation. Resets the admin PIN after 5 failed PIN attempts. Show-once.
- **Admin PIN** — 6+ character secret the operator uses to enter "admin mode" on a TSS (client registration, PIN change). Not required for transaction signing.
- **QR code data** — the `V0;…` string printed as a QR code on every receipt per KassenSichV §2. Contains tss-serial, process type, process data, tx number, signature counter, start-time, end-time, algorithm, and signature. Required for the customer-facing paper receipt to be compliant.
