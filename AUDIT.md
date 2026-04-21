# Bleiche Resort & Spa — Codebase Audit

**Date:** 2026-04-21
**Scope:** `backend/`, `frontend/`, `docs/` (excluding the legacy `bleiche-resort/` reference folder)
**Trigger:** LLM assistant feels regressed; general request to find all issues across layers.

---

## 0. TL;DR

The codebase is in decent structural shape but has accumulated real regressions — and several of them cluster around the LLM feature, which matches the user's "the agent feels stupid now" observation. The root cause is not one bug but a set of compounding ones:

1. **The frontend cannot resume past conversations.** The backend persists them and exposes `/api/conversations/*` endpoints; there is no screen that consumes those endpoints. Navigating away from chat or reloading the page permanently loses the conversation context from the user's point of view — a brand-new `conversation_id` is minted next time.
2. **Prior-turn tool calls and tool results are intentionally dropped from the agent's context.** Follow-up questions ("tell me more about that guest") have to re-derive facts from the assistant's natural-language summary.
3. **The regenerate/reload button was removed** in commit `1773276` but [docs/llm-integration.md:139-142](docs/llm-integration.md#L139-L142) still documents it.
4. **LLM docs are out of date** on the request shape — they say the frontend sends the visible thread, but it now sends only `conversation_id` (the backend reloads history from the DB).
5. **`_needs_strict_tool_call` is over-broad** — conversational phrases with words like "new", "list", "get" force a tool call on the first iteration, which can cause the model to pick an unhelpful tool rather than decline or clarify.

Beyond the LLM, the most consequential issues are: no DB connection-pool tuning, no rate limit on password-change, a JWT logout that can't actually revoke, the frontend storing the auth token in `localStorage` with an in-memory fallback on native (no secure keystore), no request timeout on `fetch`, and a lot of drift between `docs/database.dbml` / migrations / Pydantic schemas.

---

## 1. LLM Agent Regression — Root-Cause Analysis

This is the user's primary complaint. Multiple changes landed in the recent "Resume hardening work" commit (`1773276`) and combine into the feeling that the assistant has gotten dumber.

### 1.1 Conversations are persisted but unreachable from the UI — HIGH

- [backend/app/routers/conversations.py](backend/app/routers/conversations.py) fully implements `GET /api/conversations/`, `GET /api/conversations/{id}`, `DELETE`, and `/usage/me`.
- [frontend/src/api/client.ts:195-199](frontend/src/api/client.ts#L195-L199) wires `listConversations`, `getConversation`, `deleteConversation`, `myUsage`.
- **But no screen consumes them.** `grep` across `frontend/src` shows these four methods are defined and never called. [Router.tsx:3-13](frontend/src/navigation/Router.tsx#L3-L13) has no `conversations-list` route.
- In [ChatScreen.tsx:194-203](frontend/src/screens/ChatScreen.tsx), `conversationId` lives in local `useState` and is reset to `null` by `handleNewConversation()` and on component unmount. Navigating away from chat unmounts the screen; coming back mounts a fresh one with `conversationId = null`, so the next message creates a **new** conversation in the DB.
- **User-visible effect:** the assistant appears to have no memory between sessions — which is exactly the symptom described. Meanwhile the DB accumulates orphan conversations no user can see.

**Fix direction:** add a conversations list screen (drawer or header dropdown on `ChatScreen`), hydrate the current chat from `getConversation(id)` when the user picks one, and persist the last-active `conversation_id` in `storage` so a reload resumes it.

### 1.2 Tool results from prior turns are not replayed — HIGH

- [agent.py:211-214](backend/app/llm/agent.py#L211-L214) explicitly states:
  > `Tool calls and tool results from prior turns are NOT replayed — the agent works fresh each time.`
- [routers/llm.py:19-31](backend/app/routers/llm.py#L19-L31) loads only `role in {user, assistant}` messages; tool rows are filtered out.
- **Consequence:** If turn 1 is "list offers" → `list_offers` tool → assistant text "Here are 5 offers: #42 Müller…", turn 2 "download the one for Müller" must either (a) re-run `list_offers` and find Müller again, or (b) parse the IDs out of the text. The model does (b) badly when there are multiple matches, or silently picks the wrong one.
- The DB schema already stores `tool_calls` and `refs` JSONB columns per-message ([models/conversation.py:43-46](backend/app/models/conversation.py#L43-L46)), so the data is there; the agent just isn't using it.

**Fix direction:** in `_load_recent_history`, also surface the last N `refs` and inject them as a compact system-style summary ("Recent references you produced: offer #42 Müller, offer #43 …"). Cheaper than replaying tool JSON and far better than nothing.

### 1.3 The regenerate/reload button was removed but docs still describe it — MEDIUM

- Diff of commit `1773276` deletes `handleReloadResponse`, `reloadingMessageId`, and the `<ReloadIcon>` action in [ChatScreen.tsx](frontend/src/screens/ChatScreen.tsx).
- [docs/llm-integration.md:139-142](docs/llm-integration.md#L139-L142) still describes the feature.
- **Effect:** Users who learned to rely on regenerate no longer have it, and newcomers reading the docs expect behavior that isn't there.

**Fix direction:** either restore a simplified regenerate (backend already works with just `question`; sending the last user question with the same `conversation_id` gives a new answer), or remove the section from the docs.

### 1.4 `_needs_strict_tool_call` has too-aggressive regex — MEDIUM

- [agent.py:107-124](backend/app/llm/agent.py#L107-L124) flips `tool_choice` to `"required"` on iteration 0 when the user's question matches `\b(create|erstellen|generate|new|neu|list|zeige|find|suche|get|abrufen|offer|angebot|guest|gast|employee|mitarbeiter|briefing|belegung|export|download)\b`.
- Real-world phrases that match this regex but don't want a tool call: "I have a **new** question", "please help me **get** this right", "in **general** about our offers", "**find** me a reason this guest complained about X".
- When strict_mode is on, the model is forced to emit a tool call even if its best answer is to ask for clarification or to refuse. It picks *some* tool to satisfy `required`, often a wide `list_guests`/`list_offers`, and then produces an answer grounded in irrelevant rows.

**Fix direction:** narrow the regex to phrases that co-occur with an explicit object ("list offers", "show guest X"), or — better — drop the heuristic entirely and trust `tool_choice="auto"`. The system prompt already tells the model to ground answers in tool results; the modern Groq models respect that without a forced-call.

### 1.5 Duplicate tool-call fingerprinting blocks legitimate retries — MEDIUM

- [agent.py:271-274](backend/app/llm/agent.py#L271-L274): `seen_tool_calls` is keyed on `sha1(name|raw_args)`. On a repeat it returns `{"error": "Duplicate call to {name} ignored."}`.
- Combined with the system-prompt instruction "If a tool returns an error … do not retry" ([agent.py:40](backend/app/llm/agent.py#L40)), the model now sees a duplicate-call error it was already told to respect — and often gives up on that branch of reasoning.

**Fix direction:** only dedupe identical calls *within the same iteration* of the loop, not across iterations. Or allow up to 2 identical calls before flagging.

### 1.6 Model default may not match operator intent — LOW but check

- [agent.py:22](backend/app/llm/agent.py#L22): `GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")`.
- Commit `6f1ba6e` previously migrated to `openai/gpt-oss-120b`. If `backend/.env` still specifies that name, Groq may have renamed or decommissioned it — returning cryptic errors that aren't exposed cleanly. Check `backend/.env` against the [current Groq model list](https://console.groq.com/docs/models).
- The router does expose errors as `503 Assistent ist momentan nicht verfügbar` only when the `ValueError` from a missing API key fires; other Groq errors become `500 Interner Fehler im Assistenten` ([routers/llm.py:88-93](backend/app/routers/llm.py#L88-L93)) and the user sees a generic error banner.

### 1.7 Documentation drift on the request contract — MEDIUM

[docs/llm-integration.md:26-31](docs/llm-integration.md#L26-L31) says:

> The model has no persistent memory of prior turns. To support follow-up questions, the frontend sends the visible chat thread and the backend injects that history into the prompt on every request.

That is no longer accurate. As of commit `1773276`, the frontend sends `{ question, conversation_id? }` only (see [api/client.ts:184-192](frontend/src/api/client.ts#L184-L192) and [schemas/conversation.py:40-42](backend/app/schemas/conversation.py#L40-L42)). The backend reads history from the DB via `_load_recent_history`. This change was intentional (prevents client-side forgery of history) but the doc has not been updated. Anyone onboarding reads a description that contradicts the code.

---

## 2. Backend

### 2.1 Critical

**C-B1. No connection-pool tuning on the SQLAlchemy engine.** [database.py:12](backend/app/database.py#L12) — `create_engine(DATABASE_URL)` takes defaults (pool_size=5, max_overflow=10, no `pool_pre_ping`). Under any multi-worker deployment or a stale-connection network hiccup, requests will fail with `OperationalError: server closed the connection unexpectedly`. Add `pool_size`, `max_overflow`, `pool_pre_ping=True`, `pool_recycle` (e.g. 1800).

**C-B2. Password change has no rate limit.** [routers/auth.py:78-92](backend/app/routers/auth.py#L78-L92) — requires a valid token but anyone with a stolen short-lived token can brute-force `current_password`. Every other sensitive endpoint (`login`, LLM) has a limiter; this one doesn't. Add `write_limiter.check(f"u:{user.id}")`.

**C-B3. Logout cannot revoke a token.** [routers/auth.py:68-75](backend/app/routers/auth.py#L68-L75) only logs the event. JWTs here have an 8-hour TTL. If a laptop is stolen within that window, logout is cosmetic. Options: (a) maintain a server-side token blacklist keyed by `jti`, (b) shorten TTL to ~30min and add a refresh token, (c) document explicitly that logout is best-effort and security-sensitive users should revoke via password change (which *does* invalidate any token issued before the change — as long as the `iat` is checked, which it currently isn't). Current code does **not** check `iat` against a `password_changed_at`, so even that workaround doesn't hold.

### 2.2 High

**H-B1. `_read_access` and `_write_access` are identical in offers router.** [routers/offers.py:16-17](backend/app/routers/offers.py#L16-L17) — both are `ADMIN, MANAGER, RECEPTIONIST`. Either the distinction is intentional (and the code is just pre-split in case read needs to widen) or it's a missed role narrowing. The [auth.py:132-146](backend/app/auth.py#L132-L146) `MODULE_ACCESS` table shows `angebote` is open to `ADMIN, MANAGER, RECEPTIONIST` — consistent, so this is probably intentional. Flag and decide.

**H-B2. `list_offers` has no upper bound on `limit`.** [routers/offers.py:20-27](backend/app/routers/offers.py#L20-L27) — `limit: int = 200` with no `le=`. `?limit=1000000` is accepted and will try to materialize every offer + validate each through Pydantic. Add `Query(default=200, ge=1, le=500)` to match the pattern in `conversations.py:24`.

**H-B3. LLM router persists the user turn before agent success.** [routers/llm.py:62-67](backend/app/routers/llm.py#L62-L67) — `db.flush()` writes the user message; if `agent.query` then raises, the handler's `except` block re-raises an HTTPException and the user message remains committed (actually it's only flushed, not committed — but any later request in the same session commits it, and more importantly the subsequent `db.commit()` on success commits it in the success path, while the failure path bubbles through FastAPI without commit, so the flushed user msg is rolled back by `get_db`'s teardown). On closer read this is actually fine — but fragile. If `get_db` is ever refactored to autocommit, orphan user-turn rows appear.

**H-B4. LLM tool functions open raw `SessionLocal()` without rollback on error.** [llm/tools.py](backend/app/llm/tools.py) — every tool uses `session = SessionLocal()` + `try/finally close`. On exception inside `create_offer` after `session.add(offer)`, the finally closes the session but no explicit `rollback()` fires, which is OK in practice because closing rolls back implicit transactions. Still, add `except ... session.rollback()` for clarity, and — more importantly — use a context manager or depend on `get_db` so pool hygiene is consistent across the codebase.

**H-B5. Hardcoded tool schemas drift from tool functions.** [agent.py:45-58](backend/app/llm/agent.py#L45-L58) lists 12 tool schemas inline. [tools.py:387-401](backend/app/llm/tools.py#L387-L401)'s `get_all_tool_functions` also lists 12. If one changes name, adds an argument, or the function signature drifts, the model will call a non-existent tool or miss a parameter. Add a sanity check at module import (`assert set(schema_names) == set(tool_names)`) or generate one from the other.

### 2.3 Medium

**M-B1. `_validate_non_negative_price` uses string-matching to disambiguate two ValueErrors.** [schemas/offer.py:20-31](backend/app/schemas/offer.py#L20-L31) — distinguishes "couldn't parse float" from "price is negative" by checking `"negativ" in str(exc)`. If the error message is ever localized or reworded, negative prices slip through. Raise a distinct exception type.

**M-B2. `children_ages` server_default is `{}` (SQL array literal) but Pydantic default is `[]`.** [models/offer.py:45](backend/app/models/offer.py#L45), [schemas/offer.py:50](backend/app/schemas/offer.py#L50). SQLAlchemy bridges this correctly, but it's the sort of thing that becomes a 3am pager at some future migration. Use `default_factory=list` in Pydantic explicitly.

**M-B3. `Offer.notes` model allows unbounded `Text`; schema caps at 5000 chars; DB does not.** [models/offer.py:50](backend/app/models/offer.py#L50), [schemas/offer.py:55](backend/app/schemas/offer.py#L55). A direct DB insert bypassing the API can produce rows that the API then fails to serialize on read.

**M-B4. Enum storage is inconsistent between tables.** `Employee.role` uses default `Enum(EmployeeRole)` → stores the enum *name* (e.g. `MANAGER`) — which matches the uppercase values in the [employees migration:26](backend/alembic/versions/44254c85c0fd_create_employees_and_guests_tables.py#L26). `Offer.status` / `Offer.salutation` use `values_callable=_enum_values` → store the *value* (e.g. `draft`, `Herr`) — which matches the lowercase migration. **Both are internally consistent**, contrary to the claim of a data-corrupting mismatch; but *between* tables, reading the DB in raw SQL requires remembering which table uses which convention. Unify.

**M-B5. `UserRead` schema omits `updated_at`.** [schemas/user.py](backend/app/schemas/user.py) — model has it, DB has it, API doesn't expose it. Not a bug unless the frontend needs to detect stale users, but it's the kind of silent omission that causes feature gaps downstream.

**M-B6. JSON depth validator recomputes after `json.dumps` size check and accepts non-JSON-native types.** [schemas/belegung.py:28-34](backend/app/schemas/belegung.py#L28-L34) — `json.dumps(v, default=str)` stringifies anything exotic (e.g. `datetime`) for the size check, but `_depth(v)` walks the *original* python object. For current usage (frontend-produced JSON), this is fine. Document the assumption.

**M-B7. `llm_user_daily` limiter uses in-memory deque for 24h windows.** [security.py:62](backend/app/security.py#L62) — 500 entries per user × users × 24h lives in-process. Acceptable for a small team (as the file notes) but silently resets on every uvicorn restart. That means the nightly redeploy window becomes a daily-limit bypass. Either persist the counter to the DB or accept it explicitly in docs.

### 2.4 Low / Nits

- **N-B1.** [routers/auth.py:53](backend/app/routers/auth.py#L53) — `TokenResponse` doesn't include an `expires_in`; the client has no way to know the JWT TTL other than decoding it.
- **N-B2.** [routers/llm.py:58](backend/app/routers/llm.py#L58) — title is silently truncated to the first 120 chars of the question. Acceptable, but a `max_length=120` on `AskRequest.question` would keep the contract explicit.
- **N-B3.** [models/conversation.py:57](backend/app/models/conversation.py#L57) — composite index declared at module level outside the class. Works, but convention is to put it in `__table_args__` for discoverability.
- **N-B4.** [routers/llm.py:70](backend/app/routers/llm.py#L70) — `_load_recent_history(..., turns=8)[:-1]` fetches 16 messages then throws away the just-flushed user message. Simpler: fetch before the `db.add(user_msg)`.
- **N-B5.** `requirements.txt` should be pinned. (Could not inspect without a filesystem walk — confirm it is pinned to exact versions for reproducible builds.)

---

## 3. Frontend

### 3.1 Critical

**C-F1. Auth token stored in `localStorage` / in-memory Map.** [utils/storage.ts:14-33](frontend/src/utils/storage.ts#L14-L33) — on web, the token is in `localStorage` (readable by any injected script, vulnerable to XSS); on native, the "memory" fallback wipes the token on every app cold start. Neither is secure. For native, use `react-native-keychain` (iOS Keychain / Android Keystore). For web, consider moving to an httpOnly cookie issued by the backend, or at minimum document the XSS exposure risk.

**C-F2. No timeout on `fetch`.** [api/client.ts:45-73](frontend/src/api/client.ts#L45-L73) — requests hang forever if the network drops. Add `AbortSignal.timeout(15_000)` (or compose with any user-supplied signal) and surface a "timed out, please retry" message.

**C-F3. No conversation-list screen (see §1.1).** This is the top functional regression.

### 3.2 High

**H-F1. ChatScreen unmounts on navigation and discards `conversationId`.** [ChatScreen.tsx:196-202](frontend/src/screens/ChatScreen.tsx). Persist `conversationId` in `storage` (or in Router context) so back-and-forth between chat and other screens keeps the thread alive.

**H-F2. Assets referenced via web-absolute paths break on native.** Frontend audit flagged [LoginScreen.tsx](frontend/src/screens/LoginScreen.tsx) `Image source={{ uri: '/assets/bleiche-logo-text.png' }}`. React Native resolves `/assets/…` against the bundle, not a web root. Use `require()` or a platform-conditional path. (Verify this finding by opening the file — the audit agent's exact line numbers weren't cross-checked.)

**H-F3. `onUnauthorized` handler captures a stale closure.** [auth/AuthContext.tsx](frontend/src/auth/AuthContext.tsx) registers a handler once with `api.onUnauthorized`. If `setUser` / `setToken` change reference (they shouldn't in React, but the effect-deps array may drift), a 401 arriving late could apply to a newly logged-in user. Low probability, but audit the handler identity.

**H-F4. Hardcoded German strings in several screens bypass i18n.** e.g. [belegung/DaysListScreen.tsx](frontend/src/screens/belegung/DaysListScreen.tsx). Confirmed by grep — many literal strings. Route them through `t()`.

**H-F5. Error `detail` parsing does not handle structured detail arrays.** [api/client.ts:61-63](frontend/src/api/client.ts#L61-L63) — FastAPI validation errors return `detail: [{loc:[...], msg:"..."}]`, which JSON-stringified renders as raw array. Parse `detail[0].msg` when it's an array.

### 3.3 Medium

**M-F1. `appendMessage` uses `Date.now()` for message IDs.** [ChatScreen.tsx:267](frontend/src/screens/ChatScreen.tsx#L267) — two rapid sends within the same millisecond produce colliding keys; React may reuse the DOM node for the wrong message. Use `crypto.randomUUID()` (available on web; polyfill on native) or `${Date.now()}-${Math.random()}`.

**M-F2. `AbortController` cleanup in ChatScreen.** [ChatScreen.tsx:277-298](frontend/src/screens/ChatScreen.tsx). The `finally` block clears `abortRef.current` only if it still points at the same controller. In practice this is correct (the guard prevents over-clearing), but if the user clicks Send rapidly, the *old* controller is aborted before `abortRef.current` is updated — which is desired — then the new request's controller is stored. Fine on current reading; leaving as "verify under load."

**M-F3. No ErrorBoundary around individual screens.** Only `App.tsx` has a root boundary. A malformed API response in ChatScreen can blank the app.

**M-F4. `i18n` interpolation uses naïve `replaceAll` without escape.** [i18n/I18nContext.tsx:169-175](frontend/src/i18n/I18nContext.tsx#L169-L175). If a guest name contains `{somevar}`, it is re-interpolated. Use a parser that only expands known keys.

**M-F5. Offer duplication has optimistic insert with no rollback on failure.** [screens/offers/OffersListScreen.tsx:78-86](frontend/src/screens/offers/OffersListScreen.tsx#L78-L86). User sees the duplicate, then it vanishes on 500. Wrap in try/catch + revert.

**M-F6. Webpack bundle includes `html2canvas`, `highlight.js`, full markdown stack.** `webpack.config.js` does no code-splitting; the chat export is the only consumer of `html2canvas` but it ships in the main bundle. Defer via dynamic import.

### 3.4 Low / Nits

- **N-F1.** Date parsing via `new Date(s)` across web/native has locale-dependent behavior for non-ISO-Z strings. Use explicit `toISOString` on write and `new Date(s + "Z")` only for pure-date reads.
- **N-F2.** `storage.get(STORAGE_KEY) as Locale` ([i18n/I18nContext.tsx:158](frontend/src/i18n/I18nContext.tsx#L158)) accepts any stored string. Validate against `['de','en']`.
- **N-F3.** Hardcoded colors in error states of `OffersListScreen` — `'#fca5a5'`, `'#b91c1c'` — bypass the theme. Move to `colors.error*`.
- **N-F4.** `MAX_MESSAGES = 50` cap in chat silently drops history from the UI after 50 turns. The server has its own 8-turn limit for the agent prompt, but the user may want to scroll back further.
- **N-F5.** `package.json` has no `lint-staged`/`husky` — TypeScript or ESLint errors can land unverified.

---

## 4. Data Model & Migrations

### 4.1 Cross-source drift

Sources to reconcile: SQLAlchemy models, Alembic migrations, `docs/database.dbml`, `docs/database.md`, Pydantic schemas.

**D-1. EmployeeRole uppercase in migration is not a bug** — contrary to one of the audit agents' claims. The first migration creates `sa.Enum('MANAGER', 'RECEPTIONIST', …, name='employeerole')` and the Python enum uses `Enum(EmployeeRole)` without `values_callable`, so SQLAlchemy stores and reads by `.name` (uppercase). Consistent. But `Offer.status` / `Offer.salutation` use `values_callable=_enum_values` and store by `.value` (lowercase / capitalized). **Inconsistent convention** — see M-B4. This is fragility, not corruption.

**D-2. Employee/Guest `email` unique is an index-unique, not a table-unique constraint.** The migration creates `op.create_index(... unique=True)`; SQLAlchemy's `unique=True` in the column definition is honored only as a *unique index* by Alembic autogen. Functionally equivalent for constraint enforcement, but a `UNIQUE` table constraint is harder to accidentally drop. Low-severity.

**D-3. `DailyBriefing.data` JSONB shape is undocumented.** [models/belegung.py:7-20](backend/app/models/belegung.py#L7-L20) and [schemas/belegung.py:22-34](backend/app/schemas/belegung.py#L22-L34) enforce only size (512 KiB) and depth (12) — not structure. [docs/belegung.md](docs/belegung.md) describes the UX but not the blob schema. LLM tools that count `arrivals`, `stayers` ([tools.py:351](backend/app/llm/tools.py#L351)) depend on specific keys. Add a TypedDict or JSON Schema in the model file and document in `database.md`.

**D-4. `ConversationMessage` has no `updated_at`.** Intentional (messages are append-only) but not explicitly documented. Add a one-line docstring on the model noting the append-only invariant.

**D-5. Composite index `ix_conv_msg_conv_created` declared at module level outside `__table_args__`.** Works because SQLAlchemy registers `Index()` objects globally against their tables, but less discoverable. Move into the model.

**D-6. `UserRead` schema omits `updated_at`** — see M-B5.

### 4.2 Seeding / scripts

Not inspected in depth in this pass. Verify `backend/scripts/seed.py` against current enums and required columns before running it on a fresh DB.

---

## 5. Documentation drift

- [docs/llm-integration.md](docs/llm-integration.md) §2 and §"Conversation Reload" are stale (see §1.3 and §1.7).
- [docs/database.dbml](docs/database.dbml) — spot-check against the three migrations. CLAUDE.md says this file must always match the schema. The data-model agent did not find hard divergences in columns, but enum casing in DBML should be verified against migration output.
- [docs/frontend.md](docs/frontend.md) / [docs/backend.md](docs/backend.md) — CLAUDE.md's "Documentation Rule" says to update these when architecture changes. The commit `1773276` changed the chat contract, added auto-logout on 401, and capped router history — none of that is reflected in these docs yet.

---

## 6. What the audit agents got wrong (and you should ignore)

To avoid propagating noise: the three parallel audit agents produced useful signal but also a few claims that don't hold up under inspection. For transparency:

- **"EmployeeRole enum case mismatch is CRITICAL and will fail inserts."** — False. See D-1 above. SQLAlchemy stores `.name` by default; the migration and model agree on uppercase names.
- **"N+1 on Conversation message retrieval."** — [routers/conversations.py:43-54](backend/app/routers/conversations.py#L43-L54) iterates `conv.messages` which is a single lazy-load SELECT (1+1, not 1+N). Eager-loading with `selectinload` is still nice-to-have but not urgent.
- **"Frontend expects `refs`, backend sends `refs` — coincidental match."** — Not coincidental. Both sides agreed on the field name explicitly; [schemas/conversation.py:21](backend/app/schemas/conversation.py#L21) and [api/client.ts:102](frontend/src/api/client.ts#L102).
- **"Memory leak in Toast auto-dismiss."** — Not verified; the claim was about a missing dep in effect array. Open the file before acting on this one.

---

## 7. Suggested priority order

If we were picking what to fix first, in order of user-visible impact and effort:

1. **Restore conversation context** (§1.1, §1.2, §3.3 C-F3): build the conversation list screen and persist the active `conversation_id`; surface prior `refs` into the agent's system message.
2. **Tune `_needs_strict_tool_call`** (§1.4) — drop or narrow the regex.
3. **Update the LLM docs** (§1.3, §1.7) and decide whether to restore regenerate.
4. **Add DB pool config, request timeout, password-change rate limit** (§2.1 C-B1, §3.1 C-F2, §2.1 C-B2).
5. **Secure token storage on native** (§3.1 C-F1).
6. **Walk through the `docs/` drift** (§5).
7. Medium/low backlog as time allows.

---

*End of audit. Nothing above was auto-fixed; this is a read-only inventory for you to triage.*
