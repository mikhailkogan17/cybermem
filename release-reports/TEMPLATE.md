# Release Report (REGRESSION CHECK)

> [!IMPORTANT]
> This report MUST be verified and checked before every commit to main/release.
> Run manual checks and mark checkboxes with `[x]`.

## 1. Environment & Build Validation

- [ ] **Локально собрано?**: `npm run build` (All packages)
- [ ] **Версия компонентов локально**: (e.g. v0.9.13)
- [ ] **Lock-file Sync**: Node 22+ and clean `npm i`.

## 2. API & Connectivity (Regression)

- [ ] **Ответ на /stats**: Verified via `curl http://localhost:8626/metrics` or Dashboard.
- [ ] **CRUD Verification (Each step must be [x])**:
  - [ ] **Add Memory**: POST /mcp successful.
  - [ ] **Query Memory**: POST /mcp successful.
  - [ ] **Update Memory**: PATCH /mcp successful.
  - [ ] **Delete Memory**: DELETE /mcp successful.

## 3. UI & Health Check (Manual)

- [ ] **Header**: "All Systems OK" badge is visible and green.
- [ ] **MCP Modal Icons**: No missing icons in client selector.
- [ ] **Top Writer/Reader**: Verified "antigravity-client" identity appears correctly.

## 4. Documentation & Cleanup

- [ ] **GEMINI.md Update**: Postmortems and Identity rules verified.
- [ ] **Git Diff**: No accidental secrets or internal Docker hostnames.

---

**Signed off by**: [Agent Name / Username]
