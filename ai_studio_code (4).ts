import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { evaluatePackQuality } from '@/lib/minecraft/quality-gate';
import { analyzePerformance } from '@/lib/minecraft/performance';
import { autoRepairPack } from '@/lib/minecraft/repair';
import { buildCurseForgeBundle } from '@/lib/minecraft/curseforge';
import type { PackFile } from '@/lib/minecraft/pack';

const samplePackFiles: PackFile[] = [
  {
    path: 'manifest.json',
    content: JSON.stringify({
      format_version: 2,
      header: { name: 'Ethereal Skies', uuid: '64d25602-d4fd-46b1-9eff-251b53e3641f', version: [1, 0, 0], min_engine_version: [1, 26, 60] },
      modules: [{ type: 'resources', uuid: '5dc0550b-4996-45ad-b901-222eda440d94', version: [1, 0, 0] }],
    }),
  },
  {
    path: 'textures/blocks/dirt.texture_set.json',
    content: JSON.stringify({
      format_version: '1.21.90',
      'minecraft:texture_set': { color: 'textures/blocks/dirt' },
    }),
  },
];

describe('Part 2 Quality Gate State Machine', () => {
  it('blocks READY status if validation contains errors', () => {
    const report = { errors: ['Missing scripts/main.js entry'], warnings: [] };
    const result = evaluatePackQuality(samplePackFiles, report, null);
    expect(result.status).toBe('FAILED');
    expect(result.canExport).toBe(false);
  });

  it('yields READY WITH WARNINGS when only warnings are present', () => {
    const report = { errors: [], warnings: ['RenderDragon shader not supported on older versions'] };
    const result = evaluatePackQuality(samplePackFiles, report, null);
    expect(result.status).toBe('READY WITH WARNINGS');
    expect(result.canExport).toBe(true);
  });

  it('transitions to REAL DEVICE TESTED only when valid evidence is attached', () => {
    const report = { errors: [], warnings: [] };
    const evidence = {
      verifiedByUserId: 'user_123',
      deviceModel: 'Samsung Galaxy A10',
      osVersion: 'Android 11',
      importedSuccessfully: true,
      checklistPassedCount: 6,
      checklistTotalCount: 6,
      crashOccurred: false,
      testDate: new Date().toISOString(),
    };
    const result = evaluatePackQuality(samplePackFiles, report, evidence);
    expect(result.status).toBe('REAL DEVICE TESTED');
    expect(result.isRealDeviceVerified).toBe(true);
  });

  it('refuses REAL DEVICE TESTED if crash is recorded during testing', () => {
    const report = { errors: [], warnings: [] };
    const evidence = {
      verifiedByUserId: 'user_123',
      deviceModel: 'Samsung Galaxy A10',
      osVersion: 'Android 11',
      importedSuccessfully: true,
      checklistPassedCount: 6,
      checklistTotalCount: 6,
      crashOccurred: true,
      testDate: new Date().toISOString(),
    };
    const result = evaluatePackQuality(samplePackFiles, report, evidence);
    expect(result.status).not.toBe('REAL DEVICE TESTED');
  });
});

describe('Part 2 Performance Profiling Engine', () => {
  it('identifies A10 compatibility for low-weight packs and flags Ultra/PBR packs', () => {
    const lowAnalysis = analyzePerformance(samplePackFiles, 'Low');
    expect(lowAnalysis.compatibleWithTestingDevice).toBe(true);

    const pbrFiles: PackFile[] = [
      ...samplePackFiles,
      {
        path: 'textures/blocks/stone.texture_set.json',
        content: JSON.stringify({
          'minecraft:texture_set': { color: 'textures/stone', normal: 'textures/stone_normal' },
        }),
      },
      {
        path: 'manifest.json',
        content: JSON.stringify({ capabilities: ['pbr'] }),
      },
    ];
    const ultraAnalysis = analyzePerformance(pbrFiles, 'Ultra');
    expect(ultraAnalysis.hasPbr).toBe(true);
    expect(ultraAnalysis.compatibleWithTestingDevice).toBe(false);
    expect(ultraAnalysis.warnings.some((w) => w.includes('32-bit Android'))).toBe(true);
  });
});

describe('Part 2 Auto-Repair Engine', () => {
  it('corrects malformed JSON and injects missing texture maps', () => {
    const brokenPack: PackFile[] = [
      {
        path: 'manifest.json',
        content: '{"format_version": 2, "header": {"name": "Test", "uuid": "bad", "version": [1,0,0], "min_engine_version": [1,26,60]}, "modules": [{"type": "resources", "uuid": "bad"}]}',
      },
      {
        path: 'RP/textures/item_texture.json',
        content: '{"texture_data": {"nova_sword": {"textures": "textures/items/nova_sword"}},}', // trailing comma
      },
    ];

    const repaired = autoRepairPack(brokenPack, '1.26.60', 'resource');
    expect(repaired.fixedIssues.length).toBeGreaterThan(0);
    // Verified 16x16 PNG placeholder created for nova_sword
    expect(repaired.repairedFiles.some((f) => f.path.endsWith('nova_sword.png'))).toBe(true);
  });
});

describe('Part 2 CurseForge Publishing Exporter', () => {
  it('creates an outer ZIP with mcaddon/mcpack, README.md, and changelog', async () => {
    const meta = {
      projectName: 'Ethereal Skies',
      summary: 'Volumetric atmosphere',
      descriptionMarkdown: '# Ethereal Skies',
      gameVersions: ['1.26.60'],
      license: 'MIT',
      authors: ['Habib (Flicxo)'],
      category: 'Customization' as const,
      releaseType: 'release' as const,
    };

    const zipBlob = await buildCurseForgeBundle(samplePackFiles, meta, false);
    const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer());

    expect(unzipped.files['README.md']).toBeDefined();
    expect(unzipped.files['CHANGELOG.md']).toBeDefined();
    expect(unzipped.files['curseforge-metadata.json']).toBeDefined();
    expect(unzipped.files['ethereal_skies.mcpack']).toBeDefined();
  });
});