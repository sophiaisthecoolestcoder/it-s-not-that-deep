"""One-shot fiskaly KassenSichV V2 TSS setup.

Flow (per fiskaly v2 OpenAPI spec, version 2.2.2):

  auth               POST /api/v2/auth
  CREATED -> UNINIT  PATCH /api/v2/tss/{id}                    {state: UNINITIALIZED}
  set admin PIN      PATCH /api/v2/tss/{id}/admin              {admin_puk, new_admin_pin}
  admin login        POST  /api/v2/tss/{id}/admin/auth         {admin_pin}
  UNINIT -> INIT     PATCH /api/v2/tss/{id}                    {state: INITIALIZED, description}
  admin logout       POST  /api/v2/tss/{id}/admin/logout       {}
  create client      PUT   /api/v2/tss/{id}/client/{client_id} {serial_number}

AdminPin requires minLength 6 (per spec). AdminPuk requires minLength 10.

Reads env vars:
    FISKALY_API_KEY, FISKALY_API_SECRET, FISKALY_TSS_ID, FISKALY_ADMIN_PUK
    FISKALY_API_BASE_URL  (default https://kassensichv-middleware.fiskaly.com)
    FISKALY_ADMIN_PIN     (default '102030' — any 6+ char string)

Safe to re-run: steps that are already done are detected from state and skipped.
"""
from __future__ import annotations

import json
import os
import sys
import uuid

import httpx


BASE_URL = os.environ.get("FISKALY_API_BASE_URL", "https://kassensichv-middleware.fiskaly.com")
API_KEY = os.environ.get("FISKALY_API_KEY")
API_SECRET = os.environ.get("FISKALY_API_SECRET")
TSS_ID = os.environ.get("FISKALY_TSS_ID")
ADMIN_PUK = os.environ.get("FISKALY_ADMIN_PUK")
ADMIN_PIN = os.environ.get("FISKALY_ADMIN_PIN", "102030")


def _show(resp: httpx.Response, step: str) -> None:
    print(f"\n[{step}] {resp.request.method} {resp.request.url.path} -> HTTP {resp.status_code}")
    try:
        body = resp.json()
        text = json.dumps(body, indent=2, ensure_ascii=False)
    except Exception:
        text = resp.text
    if len(text) > 1500:
        text = text[:1500] + "... (truncated)"
    print(text)


def _token(client: httpx.Client) -> str:
    r = client.post("/api/v2/auth", json={"api_key": API_KEY, "api_secret": API_SECRET})
    _show(r, "auth")
    r.raise_for_status()
    return r.json()["access_token"]


def _get_tss(client: httpx.Client, headers: dict) -> dict:
    r = client.get(f"/api/v2/tss/{TSS_ID}", headers=headers)
    _show(r, "get-tss")
    r.raise_for_status()
    return r.json()


def main() -> int:
    missing = [k for k, v in {
        "FISKALY_API_KEY": API_KEY,
        "FISKALY_API_SECRET": API_SECRET,
        "FISKALY_TSS_ID": TSS_ID,
        "FISKALY_ADMIN_PUK": ADMIN_PUK,
    }.items() if not v]
    if missing:
        print(f"Missing env vars: {missing}", file=sys.stderr)
        return 2
    if len(ADMIN_PIN) < 6:
        print(f"FISKALY_ADMIN_PIN must be at least 6 characters (got {len(ADMIN_PIN)})", file=sys.stderr)
        return 2

    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        headers = {"Authorization": f"Bearer {_token(client)}"}

        tss = _get_tss(client, headers)
        state = tss.get("state")
        print(f"\nTSS state before setup: {state}")

        # CREATED -> UNINITIALIZED
        if state == "CREATED":
            r = client.patch(f"/api/v2/tss/{TSS_ID}", headers=headers, json={"state": "UNINITIALIZED"})
            _show(r, "uninitialize")
            r.raise_for_status()
            state = r.json().get("state")

        # Set / change admin PIN using the PUK. Idempotent-ish: if PIN already
        # set to this value, fiskaly returns 400 "ALREADY_SET" and we continue.
        if state == "UNINITIALIZED":
            r = client.patch(
                f"/api/v2/tss/{TSS_ID}/admin",
                headers=headers,
                json={"admin_puk": ADMIN_PUK, "new_admin_pin": ADMIN_PIN},
            )
            _show(r, "set-admin-pin")
            if r.status_code >= 400:
                # If it failed because PIN was already set, fine — keep going.
                body = r.json() if r.headers.get("content-type","").startswith("application/json") else {}
                if "ALREADY" not in str(body).upper() and r.status_code != 400:
                    r.raise_for_status()

        # Admin login
        r = client.post(
            f"/api/v2/tss/{TSS_ID}/admin/auth",
            headers=headers,
            json={"admin_pin": ADMIN_PIN},
        )
        _show(r, "admin-login")
        r.raise_for_status()

        # UNINITIALIZED -> INITIALIZED
        tss = _get_tss(client, headers)
        if tss.get("state") == "UNINITIALIZED":
            r = client.patch(
                f"/api/v2/tss/{TSS_ID}",
                headers=headers,
                json={"state": "INITIALIZED", "description": "bleiche-main-tss"},
            )
            _show(r, "initialize")
            r.raise_for_status()

        # Create client (admin MUST still be logged in for this call).
        # Caller provides the UUID.
        client_id = str(uuid.uuid4())
        r = client.put(
            f"/api/v2/tss/{TSS_ID}/client/{client_id}",
            headers=headers,
            json={"serial_number": f"bleiche-reception-{client_id[:8]}"},
        )
        _show(r, "create-client")
        r.raise_for_status()

        # Admin logout (safe even if no admin was logged in). Happens *after*
        # client creation — logout invalidates the admin session on the TSS.
        r = client.post(f"/api/v2/tss/{TSS_ID}/admin/logout", headers=headers, json={})
        _show(r, "admin-logout")

    print("\n" + "=" * 64)
    print("SETUP COMPLETE")
    print("=" * 64)
    print("Paste into backend/.env (DO NOT commit this file):")
    print(f"FISKALY_API_KEY={API_KEY}")
    print(f"FISKALY_API_SECRET={API_SECRET}")
    print(f"FISKALY_TSS_ID={TSS_ID}")
    print(f"FISKALY_CLIENT_ID={client_id}")
    print(f"FISKALY_API_BASE_URL={BASE_URL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
