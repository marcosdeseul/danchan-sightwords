"use strict";

const { PHRASE_FOREST, STAGES } = require("./content");
const COUNT = 20;
const CHECKPOINT_START = 16;
const REQUIRED_CHECKPOINTS = 3;
const ACTIVITIES = ["match", "build", "match", "build", "match", "build", "match", "build", "match", "build", "match", "build", "match", "build", "match", "build", "match", "build", "match", "match"];
const record = (value) => value && typeof value === "object" ? value : {};
const unique = (items) => [...new Set(items)];
const clamp = (value, min, max) => Number.isInteger(Number(value)) ? Math.min(Math.max(Number(value), min), max) : min;
const missionId = (stageId, index) => `phrase-stage-${stageId}-mission-${index + 1}`;
const sessionId = (value) => typeof value === "string" ? value.trim().slice(0, 120) : "";
const ids = (value, allowed) => Array.isArray(value) ? unique(value.filter((id) => typeof id === "string" && allowed.has(id))) : [];

function createDefaultPhraseStageState() {
  return { currentRoundIndex: 0, completedMissionIds: [], completedCheckpointIds: [], checkpointSessionIds: {}, checkpointAttemptSessionIds: [], checkpointAttempt: null, helpedItemIds: [], independentItemIds: [], itemResults: {}, completed: false, mastered: false, restoredArea: false, companionUnlocked: false };
}
function createDefaultPhraseForestProgress() {
  return { activeStageId: PHRASE_FOREST.stages[0].id, unlockedStageIds: [], completedStageIds: [], stages: Object.fromEntries(PHRASE_FOREST.stages.map((stage) => [String(stage.id), createDefaultPhraseStageState()])) };
}
function orderedPrefix(value, allowed) {
  const requested = new Set(Array.isArray(value) ? value.filter((id) => typeof id === "string") : []);
  const result = []; for (const id of allowed) { if (!requested.has(id)) break; result.push(id); } return result;
}
function checkpointSessions(value, allowed) {
  const result = {}; const used = new Set(); Object.entries(record(value)).forEach(([id, raw]) => { const clean = sessionId(raw); if (allowed.has(id) && clean && !used.has(clean)) { result[id] = clean; used.add(clean); } }); return result;
}
function checkpointAttempt(value, missions, items) {
  const source = record(value); const id = typeof source.missionId === "string" ? source.missionId : ""; const session = sessionId(source.sessionId);
  return missions.has(id) && session ? { missionId: id, sessionId: session, itemIds: ids(source.itemIds, items), hadError: source.hadError === true, usedHelp: source.usedHelp === true } : null;
}
function itemResults(value, allowed) {
  const result = {}; Object.entries(record(value)).forEach(([id, raw]) => { if (!allowed.has(id) || !raw || typeof raw !== "object") return; result[id] = { correct: clamp(raw.correct, 0, 999), errors: clamp(raw.errors, 0, 999), phraseHelp: clamp(raw.phraseHelp, 0, 999), wordHelp: clamp(raw.wordHelp, 0, 999) }; }); return result;
}
function checkpointReady(stageId, completed, checkpoints, sessions) {
  const activities = new Set(checkpoints.filter((id) => sessions[id]).map((id) => ACTIVITIES[Number(id.slice(`phrase-stage-${stageId}-mission-`.length)) - 1]));
  return completed.length >= COUNT && checkpoints.length >= REQUIRED_CHECKPOINTS && activities.has("build");
}
function sanitizePhraseStageState(stage, value) {
  const source = record(value); const missions = Array.from({ length: COUNT }, (_, index) => missionId(stage.id, index));
  const completedMissionIds = orderedPrefix(source.completedMissionIds, missions); const completed = new Set(completedMissionIds);
  const checkpointIds = missions.slice(CHECKPOINT_START - 1); const checkpointSet = new Set(checkpointIds);
  let completedCheckpointIds = ids(source.completedCheckpointIds, checkpointSet).filter((id) => completed.has(id));
  let checkpointSessionIds = checkpointSessions(source.checkpointSessionIds, new Set(completedCheckpointIds));
  if (source.completed === true && completedMissionIds.length === COUNT && Object.keys(checkpointSessionIds).length === 0) { completedCheckpointIds = checkpointIds.slice(0, REQUIRED_CHECKPOINTS); checkpointSessionIds = Object.fromEntries(completedCheckpointIds.map((id, index) => [id, `legacy-stage-${stage.id}-${index + 1}`])); }
  completedCheckpointIds = completedCheckpointIds.filter((id) => checkpointSessionIds[id]);
  const allowedItems = new Set([...stage.practicePhrases, ...stage.checkpointPhrases].map((item) => item.id));
  const helpedItemIds = ids(source.helpedItemIds, allowedItems); const independentItemIds = ids(source.independentItemIds, allowedItems).filter((id) => !helpedItemIds.includes(id));
  const isComplete = completedMissionIds.length >= COUNT; const missionIndex = Math.min(completedMissionIds.length, COUNT - 1);
  return { currentRoundIndex: isComplete ? 0 : clamp(source.currentRoundIndex, 0, missionIndex < CHECKPOINT_START - 1 ? 3 : 2), completedMissionIds, completedCheckpointIds, checkpointSessionIds, checkpointAttemptSessionIds: Array.isArray(source.checkpointAttemptSessionIds) ? unique(source.checkpointAttemptSessionIds.map(sessionId).filter(Boolean)) : [], checkpointAttempt: checkpointAttempt(source.checkpointAttempt, checkpointSet, allowedItems), helpedItemIds, independentItemIds, itemResults: itemResults(source.itemResults, allowedItems), completed: isComplete, mastered: checkpointReady(stage.id, completedMissionIds, completedCheckpointIds, checkpointSessionIds), restoredArea: isComplete, companionUnlocked: isComplete };
}
function sanitizePhraseForestProgress(value, wordStages) {
  const source = record(value); const saved = record(source.stages); const stages = Object.fromEntries(PHRASE_FOREST.stages.map((stage) => [String(stage.id), sanitizePhraseStageState(stage, saved[String(stage.id)] || saved[stage.id])]));
  const academyComplete = STAGES.every((stage) => wordStages[String(stage.id)].knownWords.length >= stage.words.length);
  const unlockedStageIds = []; const completedStageIds = [];
  if (academyComplete) for (const stage of PHRASE_FOREST.stages) { unlockedStageIds.push(stage.id); if (!stages[String(stage.id)].completed) break; completedStageIds.push(stage.id); }
  const requested = Number(source.activeStageId); const activeStageId = unlockedStageIds.includes(requested) ? requested : unlockedStageIds[unlockedStageIds.length - 1] || PHRASE_FOREST.stages[0].id;
  return { activeStageId, unlockedStageIds, completedStageIds, stages };
}
module.exports = { createDefaultPhraseForestProgress, sanitizePhraseForestProgress };
