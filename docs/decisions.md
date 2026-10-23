# Decisions Log

## 2026-10-23: Project reborn as Patchversion

**Context:** PatchBay was built as a concept in Sep 2026 but the code was never pushed.
The competitive landscape changed significantly with Patchline and MendAPI launching.
User requested a fresh build with a new name.

**Decision:** Build Patchversion as a separate project. Name: Patchversion. Owner: Nitish-1303.
Existing PatchBay repo untouched.

**Supersedes:** All earlier PatchBay build prompts and milestones.

## 2026-10-23: Research-first approach

**Context:** User's ALL-IN-ONE prompt requires market research and customer discovery
before architecture decisions.

**Decision:** Follow the phased approach: Research -> Discovery -> MVP definition -> Implementation.
The engine code built before the research phase is preserved but may be restructured
based on research findings.

## 2026-10-23: Blue/indigo design identity

**Context:** User's first master prompt specified blue/indigo accent, replacing the
terracotta PatchBay brand.

**Decision:** Original Patchversion branding: #4F46E5 (indigo-600) accent, Inter font,
warm white (#FAFAF9) background. No PatchBay assets or branding.

## 2026-10-23: Prove-the-loop milestone implemented

**Context:** Audit showed the committed fixture could not run: mockpay was not
installable, fixture tests mocked the client (so no red state was possible),
the mapper only handled ES modules, the fix generator's diffs were malformed,
and the PR proof numbers were inaccurate.

**Decision:** Vendor mockpay 1.0.0 and 2.0.0 inside the fixture (installed via
file: paths, no registry needed); fixture tests call the real client; the
mapper handles CommonJS require() alongside ES imports; fixes are emitted as
standard unified diffs via the `diff` library; the proof artifact records the
baseline run and the files actually changed; the PR body reports accurate
numbers and says "local process" unless the run was Docker-isolated; a single
`npm run prove` command runs the whole loop and writes transcript, proof and
prepared PR into runs/latest/.
