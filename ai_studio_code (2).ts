export interface TestingStep {
  id: string;
  title: string;
  instruction: string;
  warning?: string;
}

export const ANDROID_A10_IMPORT_STEPS: TestingStep[] = [
  {
    id: 'download',
    title: '1. Download Package on Device',
    instruction: 'Tap "Download .mcpack" or ".mcaddon" directly in Chrome or your device browser.',
  },
  {
    id: 'open_with',
    title: '2. Open in Minecraft (No PC/USB Needed)',
    instruction:
      'Swipe down your notification bar or open Downloads in Files. Tap the file. Choose "Minecraft" when prompted with "Open with".',
    warning:
      'If your file manager opens it as a zip, rename extension from .zip to .mcpack, or use Total Commander / ZArchiver to open with Minecraft.',
  },
  {
    id: 'verify_import',
    title: '3. Verify In-Game Import Banner',
    instruction:
      'Watch for the top grey toast banner in Minecraft: "Import Started..." followed by "Successfully imported [Pack Name]".',
  },
  {
    id: 'activate_packs',
    title: '4. Activate in World Settings',
    instruction:
      'Create or Edit a test world. Navigate to Resource Packs > Available > Owned > Activate. If you have behavior logic, do the same under Behavior Packs.',
  },
  {
    id: 'enable_experiments',
    title: '5. Enable Required Experiments',
    instruction:
      'Under World Settings > Experiments, toggle "Beta APIs" if the pack uses scripts. Toggle "RenderDragon / Deferred Technical Preview" if testing PBR shaders.',
  },
];

export interface ChecklistItem {
  id: string;
  category: 'Import' | 'Mobs' | 'Items' | 'Blocks' | 'Scripts' | 'Shaders';
  label: string;
  expectedBehavior: string;
}

export const ANDROID_TEST_CHECKLIST: ChecklistItem[] = [
  {
    id: 'chk_import',
    category: 'Import',
    label: 'Clean Manifest Import',
    expectedBehavior: 'No duplicate UUID or invalid min_engine_version error popups.',
  },
  {
    id: 'chk_textures',
    category: 'Items',
    label: 'Texture Rendering',
    expectedBehavior: 'No pink/black checkerboard missing texture blocks or items in hand.',
  },
  {
    id: 'chk_crafting',
    category: 'Items',
    label: 'Recipe & Inventory Integration',
    expectedBehavior: 'Items appear in the creative inventory or can be crafted at the crafting table.',
  },
  {
    id: 'chk_mobs',
    category: 'Mobs',
    label: 'Entity Spawning & Animation',
    expectedBehavior: 'Spawn egg spawns mob without crashing; walking and attack animations play.',
  },
  {
    id: 'chk_scripts',
    category: 'Scripts',
    label: 'Content Log Clean',
    expectedBehavior: 'Pause > Settings > Creator > Content Log History contains 0 script exceptions.',
  },
  {
    id: 'chk_performance',
    category: 'Shaders',
    label: 'A10 Frame Stability',
    expectedBehavior: 'Device maintains playable FPS (25-30 FPS) without freezing or rebooting Minecraft.',
  },
];