import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface EvidenceArtifactChecksum {
  relativePath: string;
  sha256: string;
  bytes: number;
}

export interface EvidenceManifest {
  version: '1.0.0';
  runId: string;
  sourceRevision: string;
  targetRepo: {
    id: string;
    fullName: string;
    commitSha?: string;
  };
  dependency: {
    packageName: string;
    fromVersion: string;
    toVersion: string;
    registryUrl?: string;
    integritySha512?: string;
  };
  execution: {
    providerName: string;
    isolationType: 'local-process' | 'docker' | 'microvm' | 'unavailable';
    command: string;
    exitCodes: {
      baseline: number;
      red: number;
      green: number;
    };
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  patch: {
    generatedFiles: string[];
    sha256: string;
    patchType: 'deterministic-ast' | 'llm-synthesized' | 'manual';
  };
  artifacts: EvidenceArtifactChecksum[];
  tamperEvidentHash: string;
}

export interface BundleValidationResult {
  valid: boolean;
  errors: string[];
  manifest: EvidenceManifest | null;
}

export class EvidenceBundleManager {
  /**
   * Computes SHA-256 hash of a file or string.
   */
  static computeSha256(content: Buffer | string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Computes the canonical tamper-evident hash for a manifest.
   */
  static computeManifestHash(manifestWithoutHash: Omit<EvidenceManifest, 'tamperEvidentHash'>): string {
    const canonicalJson = JSON.stringify(manifestWithoutHash, Object.keys(manifestWithoutHash).sort());
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }

  /**
   * Validates an evidence bundle directory against its manifest.json.
   */
  static validateBundle(bundleDir: string): BundleValidationResult {
    const errors: string[] = [];
    const manifestPath = path.join(bundleDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return {
        valid: false,
        errors: [`Missing manifest.json in evidence directory: ${bundleDir}`],
        manifest: null,
      };
    }

    let manifest: EvidenceManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      return {
        valid: false,
        errors: [`Corrupted manifest.json: ${err instanceof Error ? err.message : String(err)}`],
        manifest: null,
      };
    }

    if (!manifest.version || !manifest.runId || !manifest.artifacts || !manifest.tamperEvidentHash) {
      errors.push('Manifest is missing required root fields (version, runId, artifacts, or tamperEvidentHash)');
    }

    // Verify tamper-evident manifest hash
    const { tamperEvidentHash, ...withoutHash } = manifest;
    const expectedManifestHash = this.computeManifestHash(withoutHash);
    if (tamperEvidentHash !== expectedManifestHash) {
      errors.push(`Manifest integrity violation: tamperEvidentHash mismatch (expected ${expectedManifestHash}, found ${tamperEvidentHash})`);
    }

    // Verify each listed artifact
    for (const artifact of manifest.artifacts ?? []) {
      const artifactPath = path.join(bundleDir, artifact.relativePath);
      if (!fs.existsSync(artifactPath)) {
        errors.push(`Missing artifact file: ${artifact.relativePath}`);
        continue;
      }

      const content = fs.readFileSync(artifactPath);
      const actualHash = this.computeSha256(content);
      if (actualHash !== artifact.sha256) {
        errors.push(`Artifact hash mismatch for ${artifact.relativePath}: expected ${artifact.sha256}, got ${actualHash}`);
      }

      if (content.length !== artifact.bytes) {
        errors.push(`Artifact byte length mismatch for ${artifact.relativePath}: expected ${artifact.bytes}, got ${content.length}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      manifest: errors.length === 0 ? manifest : null,
    };
  }

  /**
   * Generates and writes an atomic tamper-evident manifest for an evidence bundle.
   */
  static writeManifest(
    bundleDir: string,
    meta: Omit<EvidenceManifest, 'version' | 'artifacts' | 'tamperEvidentHash'>,
    artifactFiles: string[],
  ): EvidenceManifest {
    const artifacts: EvidenceArtifactChecksum[] = [];

    for (const relFile of artifactFiles) {
      const fullPath = path.join(bundleDir, relFile);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Cannot create evidence manifest: required artifact missing: ${relFile}`);
      }
      const buffer = fs.readFileSync(fullPath);
      artifacts.push({
        relativePath: relFile,
        sha256: this.computeSha256(buffer),
        bytes: buffer.length,
      });
    }

    const partialManifest: Omit<EvidenceManifest, 'tamperEvidentHash'> = {
      version: '1.0.0',
      runId: meta.runId,
      sourceRevision: meta.sourceRevision,
      targetRepo: meta.targetRepo,
      dependency: meta.dependency,
      execution: meta.execution,
      patch: meta.patch,
      artifacts,
    };

    const tamperEvidentHash = this.computeManifestHash(partialManifest);
    const completeManifest: EvidenceManifest = {
      ...partialManifest,
      tamperEvidentHash,
    };

    const tmpPath = path.join(bundleDir, `manifest.json.${process.pid}.tmp`);
    const finalPath = path.join(bundleDir, 'manifest.json');
    fs.writeFileSync(tmpPath, JSON.stringify(completeManifest, null, 2), 'utf8');
    fs.renameSync(tmpPath, finalPath);

    return completeManifest;
  }
}
