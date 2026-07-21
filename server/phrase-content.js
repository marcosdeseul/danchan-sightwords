"use strict";

const TABLE_VISUAL_TOKEN = "[table]";

const CHAPTERS = Object.freeze([
  { id: "discover", title: "Discover", missionStart: 1, missionEnd: 5 },
  { id: "practice", title: "Practice", missionStart: 6, missionEnd: 10 },
  { id: "apply", title: "Apply", missionStart: 11, missionEnd: 15 },
  { id: "prove", title: "Prove", missionStart: 16, missionEnd: 20 },
]);

const MODIFIER_SYMBOLS = Object.freeze({
  the: "⭐",
  a: "1️⃣",
  my: "🧒💙",
  your: "👉",
  his: "👦",
  her: "👧",
  our: "🧑‍🤝‍🧑",
  their: "👥",
  this: "👇",
  that: "👉",
  one: "1️⃣",
  another: "➕",
});

const QUALITY_SYMBOLS = Object.freeze({
  red: "🔴",
  blue: "🔵",
  green: "🟢",
  black: "⚫",
  white: "⚪",
  yellow: "🟡",
  little: "🤏",
  big: "🔎",
  small: "▫️",
  tall: "⬆️",
  long: "↔️",
  short: "↔",
  deep: "⬇️",
  wide: "↔️",
  hot: "♨️",
  cold: "🧊",
  warm: "☀️",
  dark: "🌑",
  bright: "✨",
  quiet: "🤫",
  old: "⌛",
  young: "🌱",
  new: "✨",
  good: "👍",
  happy: "😊",
  beautiful: "🌟",
  heavy: "🏋️",
  light: "🪶",
  clean: "🫧",
  dry: "☀️",
  wild: "🌿",
  clear: "💎",
  straight: "➡️",
  strong: "💪",
  large: "🔎",
  hard: "🪨",
  soft: "☁️",
  bad: "👎",
});

const NOUN_SYMBOLS = Object.freeze({
  answer: "✅",
  ball: "⚽",
  bed: "🛏️",
  birds: "🐦🐦",
  boat: "⛵",
  book: "📘",
  box: "📦",
  boy: "👦",
  car: "🚗",
  child: "🧒",
  circle: "⭕",
  day: "🌤️",
  dog: "🐕",
  door: "🚪",
  father: "👨",
  fire: "🔥",
  flowers: "🌼",
  food: "🍎",
  game: "🎲",
  girl: "👧",
  ground: "🟫",
  hand: "✋",
  horse: "🐎",
  house: "🏠",
  letter: "✉️",
  light: "💡",
  line: "➖",
  map: "🗺️",
  moon: "🌙",
  mother: "👩",
  music: "🎵",
  name: "🏷️",
  night: "🌙",
  page: "📄",
  paper: "📄",
  picture: "🖼️",
  plan: "📋",
  questions: "❓",
  report: "📝",
  river: "🏞️",
  road: "🛣️",
  room: "🛋️",
  school: "🏫",
  seeds: "🌱",
  sky: "🌌",
  sound: "🔊",
  stars: "⭐",
  story: "📖",
  table: TABLE_VISUAL_TOKEN,
  tree: "🌳",
  voice: "🗣️",
  wall: "🧱",
  water: "💧",
  wind: "💨",
  window: "🪟",
  wood: "🪵",
  world: "🌍",
});

const ACTION_SYMBOLS = Object.freeze({
  answer: "💬",
  build: "🔨",
  can: "💪",
  carry: "📦",
  check: "✅",
  choose: "☝️",
  clean: "🫧",
  close: "🔒",
  come: "⬅️",
  could: "💭",
  cut: "✂️",
  draw: "✏️",
  eat: "🍽️",
  feel: "❤️",
  find: "🔎",
  follow: "👣",
  go: "➡️",
  hear: "👂",
  help: "🤝",
  hold: "🤲",
  listen: "👂",
  look: "👀",
  make: "🛠️",
  move: "↔️",
  open: "🔓",
  plant: "🌱",
  play: "🎮",
  read: "📖",
  see: "👀",
  should: "💡",
  show: "🖼️",
  sing: "🎵",
  stand: "🧍",
  take: "🤲",
  touch: "☝️",
  try: "🎯",
  turn: "↪️",
  wait: "⏳",
  walk: "🚶",
  wash: "🫧",
  watch: "👀",
  will: "✨",
  work: "🛠️",
  write: "✍️",
});

const CUE_SYMBOLS = Object.freeze({
  again: "🔁",
  around: "↪️",
  away: "➡️",
  back: "⬅️",
  better: "👍",
  carefully: "🎯",
  cold: "🧊",
  down: "⬇️",
  fast: "⚡",
  fly: "🪽",
  forward: "➡️",
  good: "👍",
  happy: "😊",
  here: "📍",
  home: "🏠",
  inside: "📥",
  me: "🧒",
  near: "↔",
  outside: "🌳",
  right: "➡️",
  run: "🏃",
  slowly: "🐢",
  stop: "✋",
  together: "🧑‍🤝‍🧑",
  up: "⬆️",
  warm: "☀️",
  well: "⭐",
});

const STAGE_SPECS = Object.freeze([
  {
    id: 6,
    title: "Stage 6",
    subtitle: "Two-Word Groups",
    areaName: "First Crossing",
    companion: { id: "fox", name: "Fox", emoji: "🦊" },
    restoration: "Forest Footbridge",
    intro: "Pair familiar words to reconnect the first forest path.",
    groups: stageSixGroups(),
  },
  {
    id: 7,
    title: "Stage 7",
    subtitle: "Describing Phrases",
    areaName: "Color Garden",
    companion: { id: "butterfly", name: "Butterfly", emoji: "🦋" },
    restoration: "Descriptive Flower Garden",
    intro: "Read every describing word to wake the faded garden.",
    groups: stageSevenGroups(),
  },
  {
    id: 8,
    title: "Stage 8",
    subtitle: "Action Phrases",
    areaName: "Action Clearing",
    companion: { id: "rabbit", name: "Rabbit", emoji: "🐇" },
    restoration: "Interactive Play Meadow",
    intro: "Read action phrases to bring the clearing back to life.",
    groups: stageEightGroups(),
  },
  {
    id: 9,
    title: "Stage 9",
    subtitle: "Action and Object",
    areaName: "Keeper's Workshop",
    companion: { id: "beaver", name: "Beaver", emoji: "🦫" },
    restoration: "Forest Repair Workshop",
    intro: "Read complete task phrases to repair forest homes.",
    groups: stageNineGroups(),
  },
  {
    id: 10,
    title: "Stage 10",
    subtitle: "Location Phrases",
    areaName: "Hidden Grove",
    companion: { id: "owl", name: "Owl", emoji: "🦉" },
    restoration: "Treehouse and Animal Shelters",
    intro: "Read location clues to find every hidden forest friend.",
    groups: stageTenGroups(),
  },
]);

function createPhraseForest(allowedWords) {
  const allowed = new Set(allowedWords.map((word) => word.toLocaleLowerCase("en-US")));
  const stages = STAGE_SPECS.map((spec) => {
    const items = spec.groups.flatMap((group, groupIndex) =>
      group.items.map((item, itemIndex) => phraseItem(spec.id, group, item, groupIndex, itemIndex)),
    );

    if (items.length !== 75) {
      throw new Error(`Phrase Forest Stage ${spec.id} must define exactly 75 phrases.`);
    }

    items.forEach((item) => {
      item.tokens.forEach((word) => {
        if (!allowed.has(word.toLocaleLowerCase("en-US"))) {
          throw new Error(`Phrase Forest word is outside the 1,000-word foundation: ${word}`);
        }
      });
    });

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.subtitle,
      areaName: spec.areaName,
      companion: spec.companion,
      restoration: spec.restoration,
      intro: spec.intro,
      missionCount: 20,
      chapters: CHAPTERS,
      practicePhrases: items.slice(0, 60),
      checkpointPhrases: items.slice(60),
    };
  });

  return Object.freeze({
    title: "Phrase Forest",
    subtitle: "Connect words. Restore the forest.",
    stages,
  });
}

function phraseItem(stageId, group, item, groupIndex, itemIndex) {
  const text = item.text;

  return {
    id: `phrase-${stageId}-${groupIndex + 1}-${itemIndex + 1}`,
    text,
    tokens: text.split(" "),
    contrastKey: `stage-${stageId}-${group.key}`,
    meaningSafe: item.meaningSafe !== false,
    accessibilityText: sceneAccessibilityText(stageId, text),
    visual: item.visual,
  };
}

function sceneAccessibilityText(stageId, text) {
  if (stageId === 6) return `Forest supply showing ${text}`;
  if (stageId === 7) return `Garden scene showing ${text}`;
  if (stageId === 8) return `Rabbit movement showing ${text}`;
  if (stageId === 9) return `Workshop task showing ${text}`;
  return `A squirrel ${text}`;
}

function stageSixGroups() {
  const nouns = [
    ["book", "📘"], ["house", "🏠"], ["dog", "🐕"], ["car", "🚗"],
    ["mother", "👩"], ["father", "👨"], ["boy", "👦"], ["girl", "👧"],
    ["room", "🛋️"], ["ball", "⚽"], ["tree", "🌳"], ["game", "🎲"],
    ["box", "📦"], ["table", TABLE_VISUAL_TOKEN], ["door", "🚪"],
  ];
  const modifierSets = [
    ["the", "a", "my", "your", "his"],
    ["the", "a", "her", "our", "their"],
    ["the", "a", "this", "that", "another"],
  ];

  return nouns.map(([noun, symbol], index) => ({
    key: noun,
    items: modifierSets[index % modifierSets.length].map((modifier) => ({
      text: `${modifier} ${noun}`,
      meaningSafe: modifier !== "the" && modifier !== "a",
      visual: {
        kind: "symbol",
        symbol: `${MODIFIER_SYMBOLS[modifier]} ${symbol}`,
      },
    })),
  }));
}

function stageSevenGroups() {
  const groups = [
    ["ball", ["red", "blue", "green", "black", "white"]],
    ["house", ["big", "small", "old", "new", "white"]],
    ["dog", ["little", "big", "black", "white", "happy"]],
    ["road", ["long", "short", "old", "new", "straight"]],
    ["water", ["cold", "warm", "hot", "clear", "deep"]],
    ["tree", ["tall", "small", "old", "young", "green"]],
    ["room", ["big", "small", "dark", "bright", "clean"]],
    ["box", ["big", "small", "heavy", "light", "green"]],
    ["day", ["good", "bad", "long", "hot", "cold"]],
    ["night", ["dark", "quiet", "long", "cold", "beautiful"]],
    ["horse", ["black", "white", "strong", "young", "wild"]],
    ["flowers", ["red", "blue", "yellow", "beautiful", "small"]],
    ["sky", ["blue", "bright", "dark", "clear", "beautiful"]],
    ["fire", ["hot", "bright", "small", "large", "red"]],
    ["ground", ["dry", "cold", "hard", "soft", "dark"]],
  ];

  return groups.map(([noun, qualities]) => ({
    key: noun,
    items: qualities.map((quality) => ({
      text: `${quality} ${noun}`,
      visual: {
        kind: "symbol",
        symbol: `${QUALITY_SYMBOLS[quality]} ${NOUN_SYMBOLS[noun]}`,
      },
    })),
  }));
}

function stageEightGroups() {
  const groups = [
    ["can", ["run", "play", "help", "read", "write"]],
    ["will", ["go", "come", "work", "play", "read"]],
    ["could", ["fly", "run", "help", "move", "come"]],
    ["should", ["stop", "go", "wait", "listen", "try"]],
    ["came", ["back", "home", "here", "down", "near"]],
    ["went", ["away", "home", "back", "down", "outside"]],
    ["look", ["down", "up", "back", "around", "here"]],
    ["turn", ["around", "back", "right", "down", "up"]],
    ["move", ["forward", "back", "up", "down", "around"]],
    ["walk", ["slowly", "fast", "home", "outside", "together"]],
    ["read", ["again", "well", "slowly", "carefully", "together"]],
    ["write", ["again", "well", "slowly", "carefully", "together"]],
    ["play", ["outside", "inside", "again", "together", "well"]],
    ["come", ["here", "home", "back", "inside", "near"]],
    ["feel", ["better", "good", "warm", "cold", "happy"]],
  ];

  return groups.map(([first, seconds]) => ({
    key: first,
    items: seconds.map((second) => ({
      text: `${first} ${second}`,
      visual: {
        kind: "symbol",
        symbol: `${ACTION_SYMBOLS[first] || "✨"} ${CUE_SYMBOLS[second] || ACTION_SYMBOLS[second] || "➡️"}`,
      },
    })),
  }));
}

function stageNineGroups() {
  const groups = [
    ["find", ["the book", "the map", "the ball", "the answer", "the door"]],
    ["open", ["the door", "the box", "the book", "the window", "your book"]],
    ["close", ["the door", "the box", "the book", "the window", "your book"]],
    ["see", ["the moon", "the dog", "the birds", "the house", "the light"]],
    ["hear", ["the music", "the voice", "the sound", "the birds", "the wind"]],
    ["make", ["a boat", "a house", "a game", "a plan", "a map"]],
    ["draw", ["a picture", "a map", "a circle", "a line", "a house"]],
    ["read", ["the story", "the book", "the report", "the letter", "the page"]],
    ["write", ["your name", "the answer", "a letter", "a story", "a report"]],
    ["take", ["my hand", "the book", "the map", "the ball", "the box"]],
    ["carry", ["the box", "the book", "the water", "the wood", "the food"]],
    ["watch", ["the birds", "the dog", "the game", "the sky", "the stars"]],
    ["follow", ["the road", "the line", "the map", "the plan", "the child"]],
    ["hold", ["the ball", "the book", "my hand", "the box", "the door"]],
    ["clean", ["the room", "the house", "the table", "the door", "the box"]],
  ];

  return groups.map(([verb, objects]) => ({
    key: verb,
    items: objects.map((object) => {
      const objectWord = object.split(" ").at(-1);
      return {
        text: `${verb} ${object}`,
        visual: {
          kind: "symbol",
          symbol: `${ACTION_SYMBOLS[verb]} ➜ ${NOUN_SYMBOLS[objectWord] || "✨"}`,
        },
      };
    }),
  }));
}

function stageTenGroups() {
  const groups = [
    ["table", ["on", "under", "near", "by", "beside"]],
    ["tree", ["under", "near", "by", "behind", "beside"]],
    ["house", ["in", "near", "by", "behind", "outside"]],
    ["box", ["in", "on", "under", "inside", "outside"]],
    ["door", ["at", "near", "by", "behind", "above"]],
    ["water", ["in", "near", "by", "above", "below"]],
    ["road", ["on", "near", "by", "above", "below"]],
    ["room", ["in", "inside", "outside", "near", "by"]],
    ["wall", ["on", "near", "by", "beside", "above"]],
    ["bed", ["on", "under", "near", "by", "beside"]],
    ["river", ["in", "near", "by", "above", "below"]],
    ["ground", ["on", "near", "above", "below", "by"]],
    ["school", ["at", "inside", "outside", "near", "by"]],
    ["circle", ["in", "inside", "outside", "within", "around"]],
    ["window", ["at", "near", "by", "below", "above"]],
  ];

  return groups.map(([anchor, relations]) => ({
    key: anchor,
    items: relations.map((relation) => ({
      text: locationPhrase(relation, anchor),
      visual: {
        kind: "location",
        relation,
        anchor: NOUN_SYMBOLS[anchor] || "🌳",
        target: "🐿️",
      },
    })),
  }));
}

function locationPhrase(relation, anchor) {
  if (relation === "at" && anchor === "school") {
    return "at school";
  }

  return `${relation} the ${anchor}`;
}

module.exports = { CHAPTERS, createPhraseForest };
