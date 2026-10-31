# TryPatchBay — Final CipherBill Acceptance Test Report

**Audit Date & Time:** October 31, 2026, 19:00:00 IST (13:30:00 UTC)
**Target Repository:** [`Nitish-1303/CipherBill`](https://github.com/Nitish-1303/CipherBill)
**Default Branch:** `main`
**Upstream Commit SHA:** `5f160dc1cf6907ce2397d5ef0e0b73590e3c5abf`
**Commit Date:** `2026-10-12T12:24:12Z`
**Verification Method:** Direct GitHub REST API query & local engine parsing

---

## 1. Acceptance Purpose & Boundary

`Nitish-1303/CipherBill` serves as the sole demonstration repository on the deployed production platform at [https://trypatchbay.vercel.app](https://trypatchbay.vercel.app).

This acceptance audit verified that TryPatchBay interacts with this real open-source repository without injecting synthetic mock data, without modifying upstream code, and without fabricating breaking change findings.

---

## 2. Dependency Count Recalculation & Graph Node Explanation

The dependency metrics for `Nitish-1303/CipherBill` reconcile as follows:

| Metric | Count | Technical Definition | Evidence Source |
|---|:---:|---|---|
| **Direct Production Dependencies** | **11** | Packages declared under `dependencies` in `package.json` | `package.json` manifest |
| **Direct Development Dependencies** | **8** | Packages declared under `devDependencies` in `package.json` | `package.json` manifest |
| **Total Direct Dependencies** | **19** | Combined manifest dependencies ($11 + 8$) | Manifest parser |
| **Transitive Dependencies** | **504** | Packages resolved in `package-lock.json` that are *not* direct dependencies | `package-lock.json` v3 |
| **Total Mapped Dependencies** | **523** | Unique package names in the repository ($19 + 504$) | Dependency mapper |
| **Total Lockfile Entries** | **568** | Total keys in `package-lock.json` `packages` dictionary (including root `""` and nested duplicate versions) | Raw lockfile parsing |
| **Dependency Graph Nodes** | **543** | Heterogeneous DAG nodes ($1\text{ workspace} + 523\text{ packages} + 19\text{ source files}$) | `dependency-mapper.ts` lines 240–305 |
| **Dependency Graph Edges** | **1,374** | Directed dependency and import relationships in DAG | `dependency-mapper.ts` lines 269–305 |

### Accounting for the Discrepancy: 523 Dependencies vs. 543 Graph Nodes
The graph constructor in [`packages/engine/src/scanner/dependency-mapper.ts`](file:///C:/Users/NITISH/Downloads/Patchversion/packages/engine/src/scanner/dependency-mapper.ts#L240-L305) does **not** map packages alone. It generates a heterogeneous directed acyclic graph containing three distinct node types:

1. **1 Workspace Node (`type: 'workspace'`):**
   - Constructed at line 246: `id: 'ws:package.json'`, representing the project root manifest.
2. **523 Package Nodes (`type: 'package'`):**
   - Constructed at line 260: `id: dep.id` (`dep:${name}@${resolvedVersion}`), representing the 523 uniquely resolved dependencies (19 direct + 504 lockfile transitive).
3. **19 Source-File Nodes (`type: 'source-file'`):**
   - Constructed at lines 292–300:
     ```typescript
     for (const site of dep.importingFiles) {
       const fileNodeId = `file:${site.filePath}`;
       if (!nodeSet.has(fileNodeId)) {
         nodeSet.add(fileNodeId);
         nodes.push({ id: fileNodeId, name: site.filePath, version: '', type: 'source-file', direct: false });
       }
       edges.push({ source: fileNodeId, target: dep.id, relation: 'imports' });
     }
     ```
   - Represents the 19 distinct TypeScript source files in CipherBill that contain active `import` or `require` bindings to mapped dependencies.

$$\mathbf{Total\ Graph\ Nodes = 1\ (workspace) + 523\ (packages) + 19\ (source\ files) = 543\ nodes}$$

$$\mathbf{Total\ Graph\ Edges = 1,374\ edges\ (declared\_in,\ depends\_on,\ imports)}$$

This explains the mathematical relationship directly from the code implementation.

---

## 3. Detected Frameworks & Tooling

- **Next.js:** `next@15.5.23`
- **React Ecosystem:** `react@18.3.1`, `react-dom@18.3.1`
- **Language / Typing:** `typescript@5.9.3`
- **Test Runner:** `vitest@4.1.11`
- **Bundler / Build:** `postcss@8.5.26`, `vite@8.2.2`

---

## 4. Source File Analysis & AST Scanned Coordinates

- **Total Files Inspected:** **27**
  - Configuration & Manifests: `package.json`, `package-lock.json` (2 files)
  - TypeScript Source Files: **25 files** (`.ts`, `.tsx`)
- **AST Parsing Rate:** **25 / 25 source files parsed successfully (100%)** via `ts-morph` compiler AST parser.
- **Call-Site Scanning:** Evaluated **1,842 total CallExpressions** across the source AST, intersecting invocations with tracked package imports.
- **AST Limitations:** Dynamic imports (`import(dynamicString)`), wrappers, and reflection indexing (`obj[methodName]()`) are not resolved by static AST analysis.

---

## 5. Truthfulness of Findings

When TryPatchBay executes a repository scan on `Nitish-1303/CipherBill`:

- **Reported Breaking Changes:** **0**
- **Exact Output Wording:**
  > `"No breaking changes matched the migration rules currently supported by TryPatchBay."`
- **Truthfulness Verification:**
  - CipherBill does not consume `mockpay` or `lodash@3`.
  - TryPatchBay did *not* inject synthetic mock findings from `checkout-service` or `sample-repo`.
  - The zero-finding result means no supported rules matched; it is not proof that zero breaking changes exist across all 523 dependencies.

---

## 6. Zero-Mutation Audit

Upstream GitHub API audit confirms that TryPatchBay maintained 100% read-only hygiene:

| Upstream Resource | Before Audit | After Audit | Delta |
|---|:---:|:---:|:---:|
| **Commits on `main`** | `5f160dc` (2026-10-12) | `5f160dc` (2026-10-12) | **0** |
| **Remote Branches** | 30 | 30 | **0** |
| **Pull Requests** | 55 (Latest: #55 on 2026-10-12) | 55 (Latest: #55 on 2026-10-12) | **0** |
| **Issues** | Unchanged | Unchanged | **0** |
| **Releases / Tags** | Unchanged | Unchanged | **0** |

---

## 7. Acceptance Verdict

**PASSED.**
`Nitish-1303/CipherBill` demonstrates real GitHub API integration, verified heterogeneous graph construction, and zero-mutation read-only behavior.
