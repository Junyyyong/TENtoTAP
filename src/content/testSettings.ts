/** Enable for release when saved-stage continuation is wanted again. */
export const RESUME_LEARNING_PROGRESS = false;
export function initialLearningStage(saved: number): number {
  return RESUME_LEARNING_PROGRESS ? saved : 1;
}
