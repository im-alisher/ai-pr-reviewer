export {
  PatchGenerator,
  type PatchGeneratorOptions,
  type GeneratePatchOptions,
} from './patch-generator';
export {
  buildPatchPrompt,
  PATCH_SYSTEM_PROMPT,
  type PatchPromptOptions,
} from './prompts/patch-prompt';
export { parsePatchPayload } from './patch-parser';
export {
  validateUnifiedDiff,
  stripCodeFences,
  type DiffValidationResult,
} from './unified-diff';
