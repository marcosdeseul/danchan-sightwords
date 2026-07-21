import type { PhraseItemResult, PhraseStageProgress } from "../types";

export function phraseMissionIndexFromId(stageId: number, missionId: string): number | null {
  const prefix = `phrase-stage-${stageId}-mission-`;
  const missionNumber = missionId.startsWith(prefix) ? Number(missionId.slice(prefix.length)) : 0;
  return Number.isInteger(missionNumber) && missionNumber >= 16 && missionNumber <= 20 ? missionNumber - 1 : null;
}
export function cleanOrderedPrefix(value: unknown, allowedIds: string[]): string[] {
  if (!Array.isArray(value)) return [];
  const requested = new Set(value.filter((itemId): itemId is string => typeof itemId === "string"));
  const clean: string[] = [];
  for (const itemId of allowedIds) { if (!requested.has(itemId)) break; clean.push(itemId); }
  return clean;
}
export function cleanStringIds(value: unknown, allowedIds: Set<string>): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((itemId): itemId is string => typeof itemId === "string" && allowedIds.has(itemId)))] : [];
}
function cleanSessionId(value: unknown): string { return typeof value === "string" ? value.trim().slice(0, 120) : ""; }
export function cleanSessionIds(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.map(cleanSessionId).filter(Boolean))] : []; }
export function cleanCheckpointSessionIds(value: unknown, allowedMissionIds: Set<string>): Record<string, string> {
  const clean: Record<string, string> = {}; const usedSessions = new Set<string>();
  Object.entries(recordFrom(value)).forEach(([missionId, rawSessionId]) => { const sessionId = cleanSessionId(rawSessionId); if (allowedMissionIds.has(missionId) && sessionId && !usedSessions.has(sessionId)) { clean[missionId] = sessionId; usedSessions.add(sessionId); } });
  return clean;
}
export function cleanCheckpointAttempt(value: unknown, allowedMissionIds: Set<string>, allowedItemIds: Set<string>): PhraseStageProgress["checkpointAttempt"] {
  const source = recordFrom(value); const missionId = typeof source.missionId === "string" ? source.missionId : ""; const sessionId = cleanSessionId(source.sessionId);
  return allowedMissionIds.has(missionId) && sessionId ? { missionId, sessionId, itemIds: cleanStringIds(source.itemIds, allowedItemIds), hadError: source.hadError === true, usedHelp: source.usedHelp === true } : null;
}
export function cleanItemResults(value: unknown, allowedIds: Set<string>): Record<string, PhraseItemResult> {
  const clean: Record<string, PhraseItemResult> = {};
  Object.entries(recordFrom(value)).forEach(([itemId, rawResult]) => { if (allowedIds.has(itemId)) { const result = recordFrom(rawResult); clean[itemId] = { correct: clampInteger(result.correct, 0, 999), errors: clampInteger(result.errors, 0, 999), phraseHelp: clampInteger(result.phraseHelp, 0, 999), wordHelp: clampInteger(result.wordHelp, 0, 999) }; } });
  return clean;
}
export function recordFrom(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
export function clampInteger(value: unknown, minimum: number, maximum: number): number { const number = Number(value); return Number.isInteger(number) ? Math.min(Math.max(number, minimum), maximum) : minimum; }
export function stableNumber(value: string): number { return [...value].reduce((total, character) => total + character.charCodeAt(0), 0); }
export function checkpointAttemptFor(stageState: PhraseStageProgress, missionId: string, sessionId: string): NonNullable<PhraseStageProgress["checkpointAttempt"]> {
  return stageState.checkpointAttempt?.missionId === missionId && stageState.checkpointAttempt.sessionId === sessionId ? { ...stageState.checkpointAttempt, itemIds: [...stageState.checkpointAttempt.itemIds] } : { missionId, sessionId, itemIds: [], hadError: false, usedHelp: false };
}
export function cloneStageProgress(stageState: PhraseStageProgress): PhraseStageProgress {
  return { ...stageState, completedMissionIds: [...stageState.completedMissionIds], completedCheckpointIds: [...stageState.completedCheckpointIds], checkpointSessionIds: { ...stageState.checkpointSessionIds }, checkpointAttemptSessionIds: [...stageState.checkpointAttemptSessionIds], checkpointAttempt: stageState.checkpointAttempt ? { ...stageState.checkpointAttempt, itemIds: [...stageState.checkpointAttempt.itemIds] } : null, helpedItemIds: [...stageState.helpedItemIds], independentItemIds: [...stageState.independentItemIds], itemResults: Object.fromEntries(Object.entries(stageState.itemResults).map(([itemId, result]) => [itemId, { ...result }])) };
}
