# Bleiche Resort & Spa — Hardening + Export Port (IN PROGRESS)

**User ask:** Fix all backend/frontend security, cost, correctness issues identified in audit. Port broken Word/Excel/PDF exports from `bleiche-resort/` reference. Fix frontend bugs. UI/UX polish. Test end-to-end.

Token budget tight — save state on request.

---

## ✅ COMPLETED

### Backend — DONE + smoke-tested on port 8765 (all endpoints 200)

1. **`.gitignore`** broadened (.env, .env.*, caches, dist).
2. **`backend/app/security.py`** NEW — stdlib sliding-window `RateLimiter`, `LoginLockout`, `client_ip()`, `ilike_escape()`.
3. **`backend/app/main.py`** rewritten — env-driven CORS (`ALLOWED_ORIGINS`), body-size cap, request-id log middleware, `/api/health/deep`.
4. **`backend/app/auth.py`** — `INVALID_PASSWORD_PLACEHOLDER` for timing-safe login, `TOKEN_TTL_SECONDS` env 8h default.
5. **`backend/app/routers/auth.py`** rewritten — always-KDF login, IP+user rate limit + lockout, `POST /logout`, `POST /change-password`, register rejects role elevation + ≥10 char pw + sets `must_change_password=true`. `/me` returns `must_change_password`.
6. **`backend/app/models/user.py`** — `must_change_password Boolean NOT NULL default false`.
7. **`backend/app/models/conversation.py`** NEW — `Conversation`, `ConversationMessage` (tokens, cost_micro_cents, model).
8. **`backend/app/models/__init__.py`** exports Conversation types.
9. **`backend/app/schemas/user.py`** — `ChangePasswordRequest`, validated lengths.
10. **`backend/app/schemas/offer.py`** — arrival ≤ departure, children_ages (0-17, max 10), prices non-negative, max-length fields.
11. **`backend/app/schemas/belegung.py`** — JSONB ≤512 KiB + depth ≤12.
12. **`backend/app/schemas/conversation.py`** NEW — AskRequest, AskResponse, ConversationSummary, ConversationDetail, UsageSummary, AssistantRef.
13. **`backend/app/llm/agent.py`** rewritten — default `llama-3.3-70b-versatile`, hardened prompt, tool-call dedup SHA-1, truncated results 8k chars, iter cap 5, history cap 8 pairs, returns usage {tokens, cost_micro_cents}.
14. **`backend/app/llm/tools.py`** — ILIKE escaping, search_guest_notes ≥3 chars, notes truncated 280, limits capped 50.
15. **`backend/app/routers/llm.py`** rewritten — DB-backed conversations (anti-forgery), rate-limited, no exception leaks.
16. **`backend/app/routers/conversations.py`** NEW — list/get/delete, `GET /usage/me?days=30`.
17. **`backend/app/routers/belegung.py`** — atomic upsert, write rate limit.
18. **`backend/app/routers/offers.py`** — explicit field list in duplicate_offer.
19. **Alembic `2026b4d5e6f7`** — adds must_change_password (flips existing to true), creates conversations tables. **Applied successfully.**
20. **`backend/.env.example`** — docs ALLOWED_ORIGINS, MAX_BODY_BYTES, TOKEN_TTL_SECONDS, LOG_LEVEL, Groq pricing.
21. **`backend/scripts/seed.py`** — default users must_change_password=True.

### Frontend — EXPORT FILES DONE, API CLIENT DONE, WEBPACK DONE

22. `frontend/src/data/roomCategories.ts` copied from reference.
23. `frontend/web/fonts/AlegreyaSans-{Regular,Bold}.ttf` copied.
24. `frontend/web/assets/bleiche-logo-text.png` present.
25. **`frontend/src/utils/docxExport.ts`** ADAPTED — exports `generateOfferDocx(offer)`. Works with flat snake_case Offer type. Font embedding + logo preserved.
26. **`frontend/src/utils/excelExport.ts`** copied as-is — exports `exportBelegung(data)`.
27. **`frontend/webpack.config.js`** rewritten — env-driven mode, DefinePlugin injects `REACT_APP_API_URL`, CopyWebpackPlugin copies fonts+assets, prod-safe source maps, TTF loader.
28. **`frontend/src/api/client.ts`** rewritten — env-driven BASE_URL, 401 interceptor via `onUnauthorized()`, AbortController support, new methods: `logout`, `changePassword`, `listConversations`, `getConversation`, `deleteConversation`, `myUsage`. `askAssistant(question, conversationId?, signal?)` new contract.
29. **`frontend/src/types/auth.ts`** — AuthUser has `must_change_password: boolean`.
30. **`frontend/src/types/assistant.ts`** — `AskAssistantResponse` adds `conversation_id`, `usage` (AssistantUsage).
31. **`frontend/src/screens/ChatScreen.tsx`** — `rehype-sanitize` imported (line 14 addition — NOT yet wired into plugins array).

### npm installs done

```
npm install --save docx@^9.1.1 exceljs@^4.4.0 jszip@^3.10.1 file-saver@^2.0.5 rehype-sanitize
npm install --save-dev @types/file-saver copy-webpack-plugin
```

Both succeeded, 0 vulnerabilities.

---

## 🚧 REMAINING WORK

### Immediate next steps (I paused mid-edit on ChatScreen.tsx)

1. **ChatScreen.tsx** — I added the `rehype-sanitize` import but haven't wired it into the `rehypePlugins` array yet. Also need to:
   - Change `setMessages` to also track `conversationId` state.
   - Update `handleSend` to call `api.askAssistant(q, conversationId ?? undefined, signal)` — no longer pass messages array.
   - On response, save `res.conversation_id` to state.
   - Add AbortController on send (abort on unmount).
   - Replace hardcoded `'**Fehler:** ${e.message}'` with `t('common.error')`.
   - Cap messages to last 50.
   - `handleReloadResponse` also should use new signature — and probably be removed since DB holds history now.
   - Add "New conversation" button that resets `conversationId=null` and `messages=[]`.
   - Memoize `AssistantMessage`.

**Plugin wire-up in ChatScreen** around line 164:
```tsx
rehypePlugins={[[rehypeSanitize, { ...defaultSchema, attributes: { ...defaultSchema.attributes, code: [...(defaultSchema.attributes?.code || []), 'className'] } }], rehypeHighlight]}
```
(order: sanitize first, then highlight so highlighter classnames survive.)

2. **Router.tsx** — cap history to 50 items.

3. **AuthContext.tsx** — call `onUnauthorized(() => { setToken(null); setUser(null); })` on mount. Also wire `must_change_password` redirect.

4. **LoginScreen / ChangePasswordScreen** — new screen for forced pw change. Add to router.

5. **OfferEditorScreen.tsx** —
   - Import `generateOfferDocx` from `../../utils/docxExport`.
   - Add buttons "Word (.docx)" and "PDF".
   - Word handler: `generateOfferDocx(offer)`; guard with `Platform.OS === 'web'`.
   - PDF handler: call `window.print()` (with print CSS coming).
   - Date validation: disable save if arrival > departure. Show inline error.
   - Price validation: block negative.
   - Replace hardcoded `'Fehler'`, `'Gespeichert'` with i18n.

6. **BelegungEditorScreen.tsx** —
   - Import `exportBelegung` from `../../utils/excelExport`.
   - Add "Excel (.xlsx)" button.
   - Guard with Platform.OS === 'web'.

7. **Print CSS** — create `frontend/web/print.css` with:
   ```css
   @media print {
     .no-print { display: none !important; }
     body { margin: 0; }
     .print-area { padding: 2cm; }
   }
   ```
   Include via `<link rel="stylesheet" href="/print.css" media="print">` in `frontend/web/index.html`.

8. **HomeScreen.tsx** — dashboard tiles: today's arrivals/departures/pending offers/latest briefing.

9. **OffersListScreen** — status pills, search bar, FlatList.

10. **Sidebar** — collapse, role chip at bottom.

11. **i18n keys to add** — `common.error`, `common.success`, `offer.saved`, `offer.updated`, `offer.export.word`, `offer.export.pdf`, `belegung.export.excel`, `chat.newConversation`, `auth.mustChangePassword`, etc.

### Test checklist (LAST step)

1. Backend: `cd backend && source venv/Scripts/activate && uvicorn app.main:app --reload`
2. Frontend: `cd frontend && npm run web`
3. Login admin/bleiche2026 → forced password change screen
4. Change password → relogin
5. Offer CRUD + Word export (verify fonts/logo) + PDF (print dialog)
6. Belegung edit + Excel export (verify 16 columns, Tahoma 8pt, sections)
7. Chat with conversation_id persistence; refresh preserves history
8. Rate limits: 11+ logins from same IP → 429; 21+ chats/min → 429
9. `/api/conversations/usage/me` returns tokens
10. `/api/health/deep` shows db+llm

---

## CONTRACT CHANGES (already applied to backend + api/client.ts)

- `POST /api/llm/ask`: body `{question, conversation_id?}`; response `{conversation_id, answer, references, usage}`.
- `GET /api/auth/me`: +`must_change_password`.
- New: `/api/auth/logout`, `/api/auth/change-password`, `/api/conversations/*`.
- `PUT /api/belegung/days/{day}`: 512 KiB + depth 12 caps.

## KEY PATHS

- Backend cwd: `c:\Users\Gostinska soba\Desktop\Bleiche\backend`
- Frontend cwd: `c:\Users\Gostinska soba\Desktop\Bleiche\frontend`
- Venv: `source venv/Scripts/activate`
- Reference (read-only): `bleiche-resort/frontend/src/utils/{docx,excel}Export.ts`

## DB STATE

- Migration `2026b4d5e6f7` applied.
- Users admin/rezeption/hausdame have `must_change_password=true` now.
- 64 rooms, 2 offers, 0 conversations.
