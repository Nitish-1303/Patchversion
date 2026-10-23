# Evaluation Plan

**Status:** Initial. Metrics and fixtures for measuring product quality.

## Quality Metrics

| Metric | Target | How measured |
|--------|--------|-------------|
| Detection precision | > 95% | True breaking / (true breaking + false alarms) |
| Detection recall | > 90% | True breaking detected / total actual breaking |
| Call-site mapping precision | 100% | Known fixture call sites found, zero false positives |
| Fix success rate | > 80% for known patterns | Green test after fix / total fix attempts |
| False PR rate | 0% | PRs opened that shouldn't have been |
| Time to detection | < 1 hour | Release publish to change record created |

## Evaluation Fixtures

### Fixture 1: Field rename (passing end to end, 2026-10-23)
- Package: mockpay v1 -> v2 (both vendored under fixtures/sample-repo/vendor/)
- Change: `source` renamed to `payment_method`
- Result: detect, map 2 call sites (1 affected, 1 potential), generate rename
  fix, red-to-green verified (3/3 -> 1/3 with 2 failed -> 3/3), prepared PR
  with honest coverage. Run: `npm run prove`, transcript in runs/latest/

### Fixture 2: Non-breaking feature addition
- Package: mockpay v1 -> v1.1
- Change: new `metadata` field added
- Expected: detect, classify as additive, no PR, silence
- Status: not implemented

### Fixture 3: Unfixable break
- Package: mockpay v1 -> v3
- Change: entire API redesign
- Expected: detect, map call sites, fail to generate fix, open honest issue
- Status: not implemented

### Fixture 4: No-op release
- Package: mockpay v1.0.0 -> v1.0.1
- Change: patch version, no API changes
- Expected: detect, classify as non-breaking, silence
- Status: not implemented
