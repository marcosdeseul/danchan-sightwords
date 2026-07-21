export function newWordWeightForProgress(progressRatio: number): number {
  if (progressRatio <= 0.25) return 100;
  if (progressRatio <= 0.5) return 90;
  if (progressRatio <= 0.75) return 80;
  return 70;
}
