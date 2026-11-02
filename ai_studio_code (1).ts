import type { PackFile } from './pack';

export type PerformanceTier = 'Low' | 'Medium' | 'High' | 'Ultra';

export interface PerformanceBudget {
  tier: PerformanceTier;
  targetDevice: string;
  maxRecommendedRamMb: number;
  maxEntityComplexity: number;
  maxParticlesPerBlock: number;
  description: string;
}

export const PERFORMANCE_TIERS: Record<PerformanceTier, PerformanceBudget> = {
  Low: {
    tier: 'Low',
    targetDevice: 'Budget Android (e.g. Samsung Galaxy A10, 2-3 GB RAM, 32-bit)',
    maxRecommendedRamMb: 750,
    maxEntityComplexity: 20,
    maxParticlesPerBlock: 4,
    description: 'Optimized for entry-level devices. Uses standard 16x textures, minimal ticking scripts, and classic fog.',
  },
  Medium: {
    tier: 'Medium',
    targetDevice: 'Mid-range Android / Consoles (4-6 GB RAM)',
    maxRecommendedRamMb: 1400,
    maxEntityComplexity: 60,
    maxParticlesPerBlock: 16,
    description: 'Balanced for standard gameplay. Supports custom 32x textures, basic custom UI, and moderate entity spawns.',
  },
  High: {
    tier: 'High',
    targetDevice: 'High-end Mobile / Modern PC (8 GB+ RAM)',
    maxRecommendedRamMb: 2400,
    maxEntityComplexity: 150,
    maxParticlesPerBlock: 64,
    description: 'Demanding workloads with 64x/128x textures, complex MoLang controllers, and intensive Script API gameplay.',
  },
  Ultra: {
    tier: 'Ultra',
    targetDevice: 'High-end PC / Enthusiast Hardware (16 GB+ RAM, Dedicated GPU)',
    maxRecommendedRamMb: 5000,
    maxEntityComplexity: 500,
    maxParticlesPerBlock: 256,
    description: 'Maximum fidelity. Vibrant Visuals PBR maps (MER + Normal), volumetric atmospheres, and unconstrained scripts.',
  },
};

export interface PerformanceAnalysis {
  tier: PerformanceTier;
  estimatedRamMb: number;
  textureMemoryMb: number;
  entityCountEstimate: number;
  hasParticles: boolean;
  hasScriptApi: boolean;
  hasPbr: boolean;
  warnings: string[];
  deviceRecommendations: string[];
  optimizationSuggestions: string[];
  compatibleWithTestingDevice: boolean; // Samsung A10 compatibility
}

export function analyzePerformance(files: PackFile[], selectedTier: PerformanceTier): PerformanceAnalysis {
  let textureCount = 0;
  let pbrTextureSetCount = 0;
  let entityCount = 0;
  let hasScriptApi = false;
  let scriptFileSizeKb = 0;
  let hasParticles = false;
  let hasPbr = false;

  for (const file of files) {
    if (file.path.endsWith('.png')) {
      textureCount++;
    } else if (file.path.endsWith('.texture_set.json')) {
      pbrTextureSetCount++;
      hasPbr = true;
    } else if (file.path.includes('/entities/') && file.path.endsWith('.json')) {
      entityCount++;
    } else if (file.path.endsWith('.js') || file.path.endsWith('.ts')) {
      hasScriptApi = true;
      scriptFileSizeKb += Math.round(file.content.length / 1024);
    } else if (file.path.includes('/particles/') && file.path.endsWith('.json')) {
      hasParticles = true;
    } else if (file.path.endsWith('manifest.json') && file.content.includes('"pbr"')) {
      hasPbr = true;
    }
  }

  // Base Bedrock runtime consumes ~650 MB RAM
  const baseEngineRam = 650;
  // Standard texture estimate: ~0.5MB uncompressed in GPU memory per 16x-32x texture
  const baseTextureMem = textureCount * 0.5;
  // PBR texture sets carry color + normal + MER channels = ~6MB per block set
  const pbrTextureMem = pbrTextureSetCount * 6.0;
  const textureMemoryMb = Math.round((baseTextureMem + pbrTextureMem) * 10) / 10;

  const scriptOverhead = hasScriptApi ? 80 + scriptFileSizeKb * 2 : 0;
  const entityOverhead = entityCount * 12;
  const pbrOverhead = hasPbr ? 450 : 0;

  const estimatedRamMb = Math.round(baseEngineRam + textureMemoryMb + scriptOverhead + entityOverhead + pbrOverhead);

  const warnings: string[] = [];
  const deviceRecommendations: string[] = [];
  const optimizationSuggestions: string[] = [];

  // Samsung Galaxy A10 Baseline check (2GB Total RAM, ~750MB safe headroom for Minecraft)
  const a10HeadroomMb = 750;
  const compatibleWithTestingDevice = estimatedRamMb <= a10HeadroomMb && !hasPbr;

  if (hasPbr) {
    warnings.push('Contains PBR / Deferred materials. 32-bit Android devices (like Galaxy A10) cannot render Deferred Visuals.');
    deviceRecommendations.push('Requires a 64-bit device with D3D12, Vulkan, or Apple Metal supporting Deferred Technical Preview.');
    optimizationSuggestions.push('Provide a fallback non-PBR texture pack for low-memory mobile players.');
  }

  if (hasScriptApi && scriptFileSizeKb > 100) {
    warnings.push(`Script bundle size (${scriptFileSizeKb} KB) is high. May cause tick-rate lag on weaker mobile CPUs.`);
    optimizationSuggestions.push('Debounce tick-level event listeners (e.g., world.beforeEvents.tick) to run every 5-10 ticks.');
  }

  if (entityCount > 30) {
    warnings.push(`${entityCount} custom entities declared. High mob density may trigger entity cull on mobile.`);
    optimizationSuggestions.push('Ensure mob spawning weights in spawn_rules/ are throttled to prevent crowding.');
  }

  if (estimatedRamMb > a10HeadroomMb) {
    deviceRecommendations.push(`Target hardware: Recommended at least ${Math.ceil(estimatedRamMb / 500) * 0.5} GB system RAM.`);
  } else {
    deviceRecommendations.push('Verified runnable on entry-level Android devices (2 GB RAM).');
  }

  return {
    tier: selectedTier,
    estimatedRamMb,
    textureMemoryMb,
    entityCountEstimate: entityCount,
    hasParticles,
    hasScriptApi,
    hasPbr,
    warnings,
    deviceRecommendations,
    optimizationSuggestions,
    compatibleWithTestingDevice,
  };
}