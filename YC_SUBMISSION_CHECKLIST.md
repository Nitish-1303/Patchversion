# Y Combinator Winter 2027 (W27) — Submission Checklist

Use this pre-flight checklist prior to submitting the TryPatchBay YC W27 application:

## 1. Application Materials & Copy
- [x] **Application Answers**: Completed in `YC_W27_APPLICATION.md`.
- [x] **Product Description**: Completed in `YC_PRODUCT_DESCRIPTION.md`.
- [x] **Technical Due-Diligence Report**: Completed in `YC_TECHNICAL_READINESS.md`.
- [x] **Demo Script & Shot Lists**: Documented in `YC_DEMO_SCRIPT.md` and `YC_DEMO_SHOT_LIST.md`.
- [x] **Two Distinct Video Deliverables Defined**:
  - 1-minute founder video (bullet speaking notes, high energy, direct-to-camera, no screen recording).
  - 3-minute product demo screen recording (clearly distinguishing customer-facing CipherBill demo from internal Lodash migration proof).

---

## 2. Technical Gates & Build Verification
- [x] **Gate 1 — TypeScript Compilation**: `npm run typecheck` $\rightarrow$ PASS (0 errors).
- [x] **Gate 2 — Linter**: `npm run lint` $\rightarrow$ PASS (0 errors).
- [x] **Gate 3 — Unit & Integration Tests**: `npm test` $\rightarrow$ PASS (43+ test suites, 400+ tests).
- [x] **Gate 4 — Synthetic Proof**: `npm run prove` $\rightarrow$ PASS (Mockpay proof verified).
- [x] **Gate 5 — Real Migration Proof**: `npm run prove:real` $\rightarrow$ PASS (Lodash 3 $\rightarrow$ 4 proof verified).
- [x] **Gate 6 — Prototype Readiness**: `npm run readiness` $\rightarrow$ PASS (Prototype Demo Ready: YES).
- [x] **Gate 7 — Production Build**: `npm run build` $\rightarrow$ PASS (Turbopack production build).

---

## 3. Security & Integrity Verification
- [x] **RBAC Enforced**: Mutation routes (`POST /api/approvals`, `POST /api/pull-requests`, `POST /api/packages`) require `owner` or `admin`.
- [x] **Rate Limiting Active**: 5 failed auth attempts/min and 10 scan requests/min per tenant.
- [x] **Fail-Closed Execution**: Untrusted customer code execution blocked on application hosts.
- [x] **Symlink Security**: Ancestor directory traversal and cyclic symlinks handled safely.
- [x] **Zero Fabricated Findings**: `Nitish-1303/CipherBill` demo workspace displays truthful zero findings and remains 100% read-only.

---

## 4. Release & Deployment Status
- [ ] Working tree cleanly committed and pushed to `feat/repo-scanning-and-dependency-mapping`.
- [ ] PR #31 verified green on GitHub Actions CI.
- [ ] PR #31 merged into `main`.
- [ ] Merged `main` deployed to Vercel production (`trypatchbay`).
- [ ] Live production smoke test verified against `https://trypatchbay.vercel.app`.
