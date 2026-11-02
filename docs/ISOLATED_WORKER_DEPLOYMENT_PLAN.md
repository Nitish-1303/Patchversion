# TryPatchBay — Isolated Execution Worker Deployment Plan

**Document Version:** 1.0.0  
**Target:** Safe Execution of Untrusted Customer Repository Code  
**Status:** Architecture Specified & Implemented in `ProductionIsolatedExecutionProvider` (Fail-Closed Gate Active)

---

## 1. Problem Definition & Security Boundary

TryPatchBay runs automated upgrades on customer codebases. In order to prove that a breaking change is fixed without regressions, the platform executes a 3-stage proof cycle:
1. **Baseline:** Run tests against pre-upgrade dependencies (must pass).
2. **Red:** Bump dependency to breaking major version and run tests (must fail with expected error).
3. **Green:** Apply deterministic AST patch and run tests (must pass).

**The Hard Security Rule:**  
Customer repositories contain untrusted code and arbitrary `package.json` scripts (`preinstall`, `test`). **This code must NEVER execute on the Next.js / Vercel application host.**

The application backend implements `ProductionIsolatedExecutionProvider`, which **fails closed** whenever `REMOTE_EXECUTION_WORKER_URL` is unset, refusing execution rather than degrading to unsafe local execution.

---

## 2. Managed Provider Evaluation Matrix

We evaluated four practical architectures for executing untrusted customer tests:

| Evaluation Criteria | **AWS Fargate (ECS)** | **Fly.io Machines (Firecracker)** | **Modal (gVisor)** | **Bare-Metal Firecracker (EC2/Hetzner)** |
| :--- | :--- | :--- | :--- | :--- |
| **Isolation Mechanism** | AWS Firecracker / MicroVM per task | Firecracker MicroVM per machine | gVisor Container Sandbox | Direct Linux KVM / Firecracker |
| **Hypervisor Boundary** | Hardware virtualization | Hardware virtualization | User-space kernel interception | Hardware virtualization |
| **Startup Latency** | 25 – 45 seconds | **300ms – 1.2 seconds** | 1.0 – 2.0 seconds | **< 50 milliseconds** |
| **Cost Model** | Per-second vCPU/RAM; \$0 idle | Per-second vCPU/RAM; **\$0 idle** | Per-second compute; \$0 idle | Fixed \$50–\$120/mo server cost |
| **Network Egress Controls** | Security Groups / VPC NAT | **Private 6PN mesh; egress disabled by default** | Cloud proxy allowlisting | Custom iptables / bridge |
| **Solo-Founder Ops Burden** | High (IAM, VPC, ECR, TaskDefs) | **Low (Single REST API / CLI)** | Low (but requires Python bridge) | Very High (custom kernel, jailer, networking) |
| **Suitability for TryPatchBay** | Strong enterprise fallback | **Primary Recommendation (V1)** | Feasible with bridge | Post-scale optimization |

---

## 3. Selected Architecture: Fly.io Machines (Firecracker)

### Why Fly.io Machines Wins for TryPatchBay
1. **True MicroVM Isolation:** Every execution job runs inside its own disposable Firecracker microVM with isolated kernel memory and rootfs. No container escapes possible.
2. **Fast Cold Starts:** Boots in under 1 second, enabling interactive user feedback in the TryPatchBay dashboard.
3. **Zero Idle Cost:** Machines are provisioned on-demand via REST API, execute the job, return signed artifacts, and are immediately destroyed.
4. **Maintainable by Solo Founder:** No Kubernetes clusters, no IAM policy complexity, no custom jailer daemons.

---

## 4. Execution Workflow Specification

```
[ Next.js App (Vercel) ]
         │
         │  1. Authenticate user & authorize repository
         │  2. Create signed ExecutionJob (HMAC-SHA256, nonce, TTL)
         ▼
[ ProductionIsolatedExecutionProvider ]
         │
         │  3. POST /v1/jobs to Fly.io Worker Dispatcher
         ▼
[ Fly.io Worker Machine (Firecracker MicroVM) ]
         │
         │  4. Boot disposable microVM (<1s)
         │  5. Verify HMAC signature & nonce uniqueness
         │  6. Clone repo tree (isolated tmpfs, no host secrets)
         │  7. Run: Baseline test -> Bump -> Patched test
         │  8. Calculate SHA-256 hashes of generated diffs & artifacts
         │  9. Sign artifacts with worker secret
         │ 10. Destroy microVM & wipe disk
         ▼
[ Next.js App ]
         │
         │ 11. Verify artifact signature
         │ 12. Present verified diff & test proof in Review Cockpit
```

---

## 5. Security Invariants Enforced in Worker

1. **No Ambient Secrets:** MicroVMs receive only a narrowly-scoped, temporary GitHub installation token valid for 15 minutes. No database URLs, Vercel secrets, or Stripe keys are present.
2. **Network Isolation:** Network egress is disabled during test execution (`npm_config_offline=true` and egress firewall rule).
3. **Resource Clamps:** Hard limits: 1 vCPU, 512MB RAM, 120s execution timeout.
4. **Process Tree Termination:** Worker enforces hard timeout with `taskkill` / `SIGKILL` process-tree termination.
5. **Disposable Lifecycle:** The entire microVM instance is destroyed after every job run.

---

## 6. Implementation Prerequisites & Rollout Triggers

| Phase | Trigger | Action Required | Status |
| :--- | :--- | :--- | :--- |
| **Phase A (Current)** | Local dev & Pilot launch | Fail-closed gate active; run tests via GitHub Actions on customer PR | **COMPLETE** |
| **Phase B (External Beta)** | Founder provides Fly.io or AWS credentials | Provision worker Dockerfile & deploy to Fly.io | **SPECIFIED (Ready to Deploy)** |
| **Phase C (Enterprise)** | Paid enterprise pilots requesting on-prem | Distribute TryPatchBay GitHub Actions Runner | **PLANNED** |
