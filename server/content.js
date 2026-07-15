"use strict";

const CONTENT_VERSION = 5;

const FIRST_100 = [
  "the", "of", "and", "a", "to", "in", "is", "you", "that", "it",
  "he", "was", "for", "on", "are", "as", "with", "his", "they", "I",
  "at", "be", "this", "have", "from", "or", "one", "had", "by", "word",
  "but", "not", "what", "all", "were", "we", "when", "your", "can", "said",
  "there", "use", "an", "each", "which", "she", "do", "how", "their", "if",
  "will", "up", "other", "about", "out", "many", "then", "them", "these", "so",
  "some", "her", "would", "make", "like", "him", "into", "time", "has", "look",
  "two", "more", "write", "go", "see", "number", "no", "way", "could", "people",
  "my", "than", "first", "water", "been", "called", "who", "am", "its", "now",
  "find", "long", "down", "day", "did", "get", "come", "made", "may", "part",
];

const SECOND_100 = [
  "over", "new", "sound", "take", "only", "little", "work", "know", "place", "year",
  "live", "me", "back", "give", "most", "very", "after", "thing", "our", "just",
  "name", "good", "sentence", "man", "think", "say", "great", "where", "help", "through",
  "much", "before", "line", "right", "too", "mean", "old", "any", "same", "tell",
  "boy", "follow", "came", "want", "show", "also", "around", "form", "three", "small",
  "set", "put", "end", "does", "another", "well", "large", "must", "big", "even",
  "such", "because", "turn", "here", "why", "ask", "went", "men", "read", "need",
  "land", "different", "home", "us", "move", "try", "kind", "hand", "picture", "again",
  "change", "off", "play", "spell", "air", "away", "animal", "house", "point", "page",
  "letter", "mother", "answer", "found", "study", "still", "learn", "should", "America", "world",
];

const THIRD_100 = [
  "high", "every", "near", "add", "food", "between", "own", "below", "country", "plant",
  "last", "school", "father", "keep", "tree", "never", "start", "city", "earth", "eye",
  "light", "thought", "head", "under", "story", "saw", "left", "don't", "few", "while",
  "along", "might", "close", "something", "seem", "next", "hard", "open", "example", "begin",
  "life", "always", "those", "both", "paper", "together", "got", "group", "often", "run",
  "important", "until", "children", "side", "feet", "car", "mile", "night", "walk", "white",
  "sea", "began", "grow", "took", "river", "four", "carry", "state", "once", "book",
  "hear", "stop", "without", "second", "later", "miss", "idea", "enough", "eat", "face",
  "watch", "far", "Indian", "real", "almost", "let", "above", "girl", "sometimes", "mountain",
  "cut", "young", "talk", "soon", "list", "song", "being", "leave", "family", "it's",
];

const FOURTH_100 = [
  "body", "music", "color", "stand", "sun", "questions", "fish", "area", "mark", "dog",
  "horse", "birds", "problem", "complete", "room", "knew", "since", "ever", "piece", "told",
  "usually", "didn't", "friends", "easy", "heard", "order", "red", "door", "sure", "become",
  "top", "ship", "across", "today", "during", "short", "better", "best", "however", "low",
  "hours", "black", "products", "happened", "whole", "measure", "remember", "early", "waves", "reached",
  "listen", "wind", "rock", "space", "covered", "fast", "several", "hold", "himself", "toward",
  "five", "step", "morning", "passed", "vowel", "true", "hundred", "against", "pattern", "numeral",
  "table", "north", "slowly", "money", "map", "farm", "pulled", "draw", "voice", "seen",
  "cold", "cried", "plan", "notice", "south", "sing", "war", "ground", "fall", "king",
  "town", "I'll", "unit", "figure", "certain", "field", "travel", "wood", "fire", "upon",
];

const FIFTH_100 = [
  "done", "English", "road", "half", "ten", "fly", "gave", "box", "finally", "wait",
  "correct", "oh", "quickly", "person", "became", "shown", "minutes", "strong", "verb", "stars",
  "front", "feel", "fact", "inches", "street", "decided", "contain", "course", "surface", "produce",
  "building", "ocean", "class", "note", "nothing", "rest", "carefully", "scientists", "inside", "wheels",
  "stay", "green", "known", "island", "week", "less", "machine", "base", "ago", "stood",
  "plane", "system", "behind", "ran", "round", "boat", "game", "force", "brought", "understand",
  "warm", "common", "bring", "explain", "dry", "though", "language", "shape", "deep", "thousands",
  "yes", "clear", "equation", "yet", "government", "filled", "heat", "full", "hot", "check",
  "object", "else", "rule", "among", "noun", "power", "cannot", "able", "six", "size",
  "dark", "ball", "material", "special", "heavy", "fine", "pair", "circle", "include", "built",
];

const SIXTH_100 = [
  "can't", "matter", "square", "syllables", "perhaps", "bill", "felt", "suddenly", "test", "direction",
  "center", "farmers", "ready", "anything", "divided", "general", "energy", "subject", "Europe", "moon",
  "region", "return", "believe", "dance", "members", "picked", "simple", "cells", "paint", "mind",
  "love", "cause", "rain", "exercise", "eggs", "train", "blue", "wish", "drop", "developed",
  "window", "difference", "distance", "heart", "site", "sum", "summer", "wall", "forest", "probably",
  "legs", "sat", "main", "winter", "wide", "written", "length", "reason", "kept", "interest",
  "arms", "brother", "race", "present", "beautiful", "store", "job", "edge", "past", "sign",
  "record", "finished", "discovered", "wild", "happy", "beside", "gone", "sky", "grass", "million",
  "west", "lay", "weather", "root", "instruments", "meet", "third", "months", "paragraph", "raised",
  "represent", "soft", "whether", "clothes", "flowers", "shall", "teacher", "held", "describe", "drive",
];

const SEVENTH_100 = [
  "cross", "speak", "solve", "appear", "metal", "son", "either", "ice", "sleep", "village",
  "factors", "result", "jumped", "snow", "ride", "care", "floor", "hill", "pushed", "baby",
  "buy", "century", "outside", "everything", "tall", "already", "instead", "phrase", "soil", "bed",
  "copy", "free", "hope", "spring", "case", "laughed", "nation", "quite", "type", "themselves",
  "temperature", "bright", "lead", "everyone", "method", "section", "lake", "iron", "within", "dictionary",
  "hair", "age", "amount", "scale", "pounds", "although", "per", "broken", "moment", "tiny",
  "possible", "gold", "milk", "quiet", "natural", "lot", "stone", "act", "build", "middle",
  "speed", "count", "consonant", "someone", "sail", "rolled", "bear", "wonder", "smiled", "angle",
  "fraction", "Africa", "killed", "melody", "bottom", "trip", "hole", "poor", "let's", "fight",
  "surprise", "French", "died", "beat", "exactly", "remain", "dress", "cat", "couldn't", "fingers",
];

const REWARD_SLOTS = [
  "weapon", "boots", "shield", "cape", "armor", "belt", "gloves", "helmet", "banner", "crown",
  "medal", "gem", "pack", "lantern", "crest", "star", "map", "torch", "flag", "trophy",
  "compass", "scroll", "badge", "canteen", "whistle",
];

const STAGE_REWARD_SLOT_OVERRIDES = {
  4: {
    2: "radio",
  },
};

const REWARD_ID_ALIASES = {
  "stage4-shield": "stage4-radio",
};

const REWARD_NAMES = {
  1: [
    "Stone Hammer", "Hide Boots", "Pebble Shield", "Leaf Cape", "Bone Vest",
    "Twine Belt", "Shell Gloves", "Rock Helmet", "Cave Banner", "Sun Crown",
  ],
  2: [
    "Parade Gladius", "March Sandals", "Legion Scutum", "Red Cloak", "Bronze Cuirass",
    "Laurel Sash", "Bracer Gloves", "Centurion Helm", "Eagle Standard", "Laurel Wreath",
    "Victory Medallion", "Ruby Seal", "Scout Satchel", "Forum Lantern", "Roman Crest",
  ],
  3: [
    "Knight Sword", "Iron Greaves", "Bright Kite Shield", "Hero Cape", "Star Plate",
    "Explorer Belt", "Helping Gauntlets", "Brave Helmet", "Victory Banner", "Royal Crown",
    "Silver Medal", "Emerald Charm", "Quest Pack", "Castle Lantern", "Royal Crest",
    "Castle Star", "Knight Map", "Beacon Torch", "Royal Flag", "Tournament Trophy",
  ],
  4: [
    "Foam Training Gun", "Field Boots", "Field Radio", "Rain Poncho", "Modern Vest",
    "Tool Belt", "Bright Gloves", "Scout Helmet", "Unit Banner", "Patrol Cap",
    "Honor Patch", "Signal Beacon", "Field Pack", "Camp Lantern", "Service Crest",
    "Service Star", "Field Map", "Signal Light", "Unit Flag", "Challenge Cup",
    "Field Compass", "Mission Plan", "Service Badge", "Field Canteen", "Team Whistle",
  ],
};

const STAGES = [
  {
    id: 1,
    title: "Stage 1",
    subtitle: "Ancient Warrior",
    themeClass: "stage-ancient",
    heroName: "Ancient Warrior",
    words: FIRST_100,
    fieldTrip: {
      title: "Ancient Field Trip",
      intro: "Cross the valley, face cave wolves and dragons, and block their charges.",
      finish: "Stage 2 unlocked!",
      creatures: ["Cave Wolf", "Ember Dragon", "Moss Wolf", "Stone Dragon", "Moon Wolf"],
    },
  },
  {
    id: 2,
    title: "Stage 2",
    subtitle: "Roman Warrior",
    themeClass: "stage-roman",
    heroName: "Roman Warrior",
    words: [...SECOND_100, ...THIRD_100.slice(0, 50)],
    fieldTrip: {
      title: "Roman Road Field Trip",
      intro: "Guard the Roman road from swift wolves and bright little dragons.",
      finish: "Stage 3 unlocked!",
      creatures: ["Road Wolf", "Sun Dragon", "Laurel Wolf", "Bronze Dragon", "Silver Wolf"],
    },
  },
  {
    id: 3,
    title: "Stage 3",
    subtitle: "Medieval Knight",
    themeClass: "stage-medieval",
    heroName: "Medieval Knight",
    words: [...THIRD_100.slice(50), ...FOURTH_100, ...FIFTH_100.slice(0, 50)],
    fieldTrip: {
      title: "Castle Field Trip",
      intro: "Defend the castle trail from forest wolves and colorful dragons.",
      finish: "Stage 4 unlocked!",
      creatures: ["Forest Wolf", "Ruby Dragon", "Snow Wolf", "Castle Dragon", "Shadow Wolf"],
    },
  },
  {
    id: 4,
    title: "Stage 4",
    subtitle: "Modern Soldier",
    themeClass: "stage-modern",
    heroName: "Modern Soldier",
    words: [...FIFTH_100.slice(50), ...SIXTH_100, ...SEVENTH_100],
    fieldTrip: {
      title: "Modern Field Trip",
      intro: "Protect the city course from cyber wolves and sky dragons.",
      finish: "All stages complete!",
      creatures: ["Cyber Wolf", "Sky Dragon", "Neon Wolf", "Steel Dragon", "Scout Wolf"],
    },
  },
];

function rewardsForStage(stage) {
  const names = REWARD_NAMES[stage.id];
  const slotOverrides = STAGE_REWARD_SLOT_OVERRIDES[stage.id] || {};

  return names.map((name, index) => ({
    id: `stage${stage.id}-${slotOverrides[index] || REWARD_SLOTS[index]}`,
    name,
    slot: slotOverrides[index] || REWARD_SLOTS[index],
    stageId: stage.id,
    milestone: (index + 1) * 10,
    visualKey: `stage${stage.id}-${slotOverrides[index] || REWARD_SLOTS[index]}`,
  }));
}

const STAGE_BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));
const PUBLIC_CONTENT = Object.freeze({
  version: CONTENT_VERSION,
  rewardAliases: REWARD_ID_ALIASES,
  stages: STAGES.map((stage) => ({
    id: stage.id,
    title: stage.title,
    subtitle: stage.subtitle,
    themeClass: stage.themeClass,
    heroName: stage.heroName,
    words: stage.words,
    rewards: rewardsForStage(stage),
    fieldTrip: stage.fieldTrip,
  })),
});

function stageById(stageId) {
  return STAGE_BY_ID.get(Number(stageId)) || STAGES[0];
}

function allStageIds() {
  return STAGES.map((stage) => stage.id);
}

module.exports = {
  CONTENT_VERSION,
  PUBLIC_CONTENT,
  REWARD_ID_ALIASES,
  STAGES,
  stageById,
  allStageIds,
  rewardsForStage,
};
