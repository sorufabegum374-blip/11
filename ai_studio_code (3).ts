import { finalizePack, normalizeVersion, type PackFile } from './pack';
import { addMissingTextures, pinScriptVersions, validatePack, type Report } from './validate';

export interface RepairResult {
  repairedFiles: PackFile[];
  fixedIssues: string[];
  remainingReport: Report;
}

export function autoRepairPack(
  files: PackFile[],
  bedrockVersion: string,
  kind: string
): RepairResult {
  const fixedIssues: string[] = [];
  const normalizedVer = normalizeVersion(bedrockVersion);

  // 1. Sanitize JSON syntax errors where possible (e.g. trailing commas)
  const sanitized = files.map((f) => {
    if (f.path.endsWith('.json') && typeof f.content === 'string') {
      try {
        JSON.parse(f.content);
        return f;
      } catch {
        const cleaned = f.content
          .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
          .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1'); // remove accidental comments
        try {
          JSON.parse(cleaned);
          fixedIssues.push(`Cleaned malformed JSON syntax in ${f.path}`);
          return { ...f, content: cleaned };
        } catch {
          return f;
        }
      }
    }
    return f;
  });

  // 2. Enforce UUIDs, versions and dependency relationships
  const finalized = finalizePack(sanitized, normalizedVer);
  fixedIssues.push('Rebuilt manifests with synchronized UUIDs and min_engine_version.');

  // 3. Pin script API versions to verified registry endpoints
  pinScriptVersions(finalized.files, normalizedVer);
  fixedIssues.push('Pinned @minecraft/server dependencies to stable engine versions.');

  // 4. Fill in referenced textures with genuine 16x16 PNG assets
  const addedTextures = addMissingTextures(finalized.files);
  if (addedTextures.length > 0) {
    fixedIssues.push(`Synthesized ${addedTextures.length} missing texture(s): ${addedTextures.join(', ')}`);
  }

  // 5. Run final validation
  const finalReport = validatePack(finalized.files, normalizedVer, kind);

  return {
    repairedFiles: finalized.files,
    fixedIssues,
    remainingReport: finalReport,
  };
}