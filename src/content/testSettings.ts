/** Release behavior: resume tutorial progress; 31 means tutorial completed. */
export const RESUME_LEARNING_PROGRESS = true;
export function initialLearningStage(saved: number): number {
  return RESUME_LEARNING_PROGRESS && Number.isSafeInteger(saved) && saved > 0 ? Math.min(saved, 31) : 1;
}
