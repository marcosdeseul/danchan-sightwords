export function phraseReadingDayId(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `phrase-reading-day-${year}-${month}-${day}`;
}

export function readingDayControl(enabled: boolean, onStart: () => void): (() => void) | undefined {
  return enabled ? onStart : undefined;
}
