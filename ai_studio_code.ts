import type { PackFile } from './pack';
import type { Report } from './validate';

export type PackStatus =
  | 'GENERATING'
  | 'VALIDATING'
  | 'REPAIRING'
  | 'READY'
  | 'READY WITH WARNINGS'
  | 'FAILED'
  | 'REAL DEVICE TESTED';

export interface DeviceTestEvidence {
  verifiedByUserId: string;
  deviceModel: string;
  osVersion: string;
  importedSuccessfully: boolean;
  checklistPassedCount: number;
  checklistTotalCount: number;
  crashOccurred: boolean;
  notes?: string;
  testDate: string;
}

export interface QualityEvaluation {
  status: PackStatus;
  canExport: boolean;
  blockingReasons: string[];
  warnings: string[];
  isRealDeviceVerified: boolean;
}

export function evaluatePackQuality(
  files: PackFile[],
  report: Report,
  evidence?: DeviceTestEvidence | null
): QualityEvaluation {
  const blockingReasons: string[] = [];
  const warnings: string[] = [...report.warnings];

  if (files.length === 0) {
    blockingReasons.push('Pack contains no files.');
  }

  // Mandatory checks: every pack must contain at least one valid manifest.json
  const hasManifest = files.some(
    (f) => f.path === 'manifest.json' || f.path.endsWith('/manifest.json')
  );
  if (!hasManifest) {
    blockingReasons.push('Pack is missing manifest.json.');
  }

  // Any error in static validation blocks READY status
  if (report.errors.length > 0) {
    blockingReasons.push(...report.errors);
  }

  if (blockingReasons.length > 0) {
    return {
      status: 'FAILED',
      canExport: false,
      blockingReasons,
      warnings,
      isRealDeviceVerified: false,
    };
  }

  // If real device evidence is verified, no crash occurred, and all items passed
  if (
    evidence &&
    evidence.importedSuccessfully &&
    !evidence.crashOccurred &&
    evidence.checklistPassedCount > 0 &&
    evidence.checklistPassedCount === evidence.checklistTotalCount
  ) {
    return {
      status: 'REAL DEVICE TESTED',
      canExport: true,
      blockingReasons: [],
      warnings,
      isRealDeviceVerified: true,
    };
  }

  if (warnings.length > 0) {
    return {
      status: 'READY WITH WARNINGS',
      canExport: true,
      blockingReasons: [],
      warnings,
      isRealDeviceVerified: false,
    };
  }

  return {
    status: 'READY',
    canExport: true,
    blockingReasons: [],
    warnings: [],
    isRealDeviceVerified: false,
  };
}