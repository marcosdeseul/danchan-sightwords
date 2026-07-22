import type { RewardSlot } from "../types";

const PILOT_CHARACTER_TRANSFORMS: Partial<Record<RewardSlot, string>> = {
  weapon: "translate(145 104) scale(0.82)",
  boots: "translate(71 177) scale(1.18)",
  shield: "translate(8 91) scale(1.15)",
  cape: "translate(79 129) scale(1.1)",
  armor: "translate(78 91) scale(1)",
  belt: "translate(79 126) scale(1)",
  gloves: "translate(77 116) scale(1.05)",
  helmet: "translate(78 18) scale(1)",
  banner: "translate(155 43) scale(0.92)",
  crown: "translate(78 28) scale(1)",
  medal: "translate(91 94) scale(0.58)",
  gem: "translate(131 70) scale(0.52)",
  pack: "translate(62 94) scale(0.82)",
  lantern: "translate(151 134) scale(0.55)",
  crest: "translate(99 106) scale(0.38)",
  star: "translate(72 92) scale(0.43)",
  map: "translate(128 115) scale(0.58)",
  torch: "translate(151 151) scale(0.48)",
  flag: "translate(26 128) scale(0.64)",
  trophy: "translate(91 128) scale(0.48)",
  compass: "translate(118 96) scale(0.4)",
  scroll: "translate(56 126) scale(0.52)",
  badge: "translate(86 111) scale(0.34)",
  canteen: "translate(33 144) scale(0.62)",
  whistle: "translate(136 89) scale(0.48)",
  engine: "translate(43 108) scale(1.3)",
  intake: "translate(75 83) scale(1.08)",
  gauge: "translate(95 128) scale(0.48)",
  afterburner: "translate(81 143) scale(1.05)",
  jetmodel: "translate(143 22) scale(0.72)",
};

export function pilotCharacterTransform(slot: RewardSlot): string {
  return PILOT_CHARACTER_TRANSFORMS[slot] || "translate(78 92) scale(0.5)";
}

export function PilotBaseDetails() {
  return (
    <g className="pilot-base-details" aria-hidden="true">
      <path className="pilot-suit-zip" d="M110 91v61" />
      <path className="pilot-suit-harness" d="m87 95 23 34 23-34M91 145h38" />
      <path className="pilot-headset" d="M86 55c0-29 48-29 48 0M85 55v18M135 55v18" />
      <path className="pilot-microphone" d="M135 67c10 2 9 12-2 12h-8" />
      <path className="pilot-wings" d="m99 112 11 6 11-6-4 9h-14Z" />
    </g>
  );
}

export function PilotGearShape({ slot }: { slot: RewardSlot }) {
  switch (slot) {
    case "weapon": return <><circle className="pilot-fill" cx="22" cy="50" r="9" /><path className="pilot-line" d="m25 44 15-25" /><path className="pilot-accent" d="M35 10h16v15H35Z" /></>;
    case "boots": return <><path className="pilot-line" d="M17 12v29M47 12v29M12 18h10M42 18h10" /><circle className="pilot-fill" cx="17" cy="49" r="9" /><circle className="pilot-fill" cx="47" cy="49" r="9" /></>;
    case "shield": return <><path className="pilot-fill" d="m5 37 48-24 7 11-25 16-2 14-11 3-2-12Z" /><path className="pilot-line" d="m18 35 31-15M25 43l8 10" /></>;
    case "cape": return <><path className="pilot-accent" d="M15 53 35 7l15 48-18-11Z" /><path className="pilot-line" d="M33 14v31M22 41l24 2" /></>;
    case "armor": return <><path className="pilot-fill" d="m19 9 13-5 13 5 8 40-21 11-21-11Z" /><path className="pilot-accent" d="M24 15h16v31H24Z" /><path className="pilot-line" d="M32 8v45" /></>;
    case "belt": return <><path className="pilot-line" d="m12 8 20 24L52 8M10 36h44M18 36v19M46 36v19" /><rect className="pilot-accent" x="25" y="29" width="14" height="14" rx="3" /></>;
    case "gloves": return <><path className="pilot-fill" d="M8 23h17l7 10-8 20H10L5 36Z" /><path className="pilot-fill" d="M56 23H39l-7 10 8 20h14l5-17Z" /><path className="pilot-line" d="m12 22 2-10M18 22V9M24 24l3-9M52 22l-2-10M46 22V9M40 24l-3-9" /></>;
    case "helmet": return <><path className="pilot-fill" d="M9 37C9 5 55 5 55 37v14H9Z" /><path className="pilot-accent" d="M15 30c8-14 26-14 34 0l-5 12H20Z" /><path className="pilot-line" d="M13 50h42" /></>;
    case "banner": return <><path className="pilot-line" d="M14 7v50" /><path className="pilot-accent" d="M14 10h39L42 30l11 20H14Z" /><path className="pilot-line" d="M25 19h16M25 32h12" /></>;
    case "crown": return <><path className="pilot-fill" d="M8 43C12 12 52 12 56 43Z" /><path className="pilot-accent" d="M15 35c7-13 27-13 34 0l-5 10H20Z" /></>;
    case "medal": return <><circle className="pilot-fill" cx="32" cy="32" r="24" /><path className="pilot-line" d="M32 13v5M15 32h5M44 32h5M32 46v5M32 32l11-9" /><circle className="pilot-accent" cx="32" cy="32" r="4" /></>;
    case "gem": return <><path className="pilot-fill" d="M8 32 50 12l6 40Z" /><path className="pilot-line" d="M17 32h22M46 23c8 5 8 13 0 18M40 27c4 3 4 7 0 10" /></>;
    case "pack": return <><path className="pilot-fill" d="M17 12h30v45H17Z" /><path className="pilot-accent" d="M22 7h20v14H22Z" /><path className="pilot-line" d="M17 36h30M12 18l5 9M52 18l-5 9" /></>;
    case "lantern": return <><path className="pilot-fill" d="m5 38 44-22 10 9-35 22Z" /><circle className="pilot-signal-red" cx="54" cy="22" r="7" /><path className="pilot-line" d="m18 37 12 10" /></>;
    case "crest": return <><circle className="pilot-fill" cx="32" cy="32" r="24" /><circle className="pilot-accent" cx="32" cy="32" r="15" /><circle className="pilot-fill" cx="32" cy="32" r="6" /></>;
    case "star": return <><path className="pilot-line" d="M8 32h48" /><circle className="pilot-signal-red" cx="10" cy="32" r="8" /><circle className="pilot-signal-green" cx="54" cy="32" r="8" /><path className="pilot-fill" d="m32 18 8 14-8 14-8-14Z" /></>;
    case "map": return <><rect className="pilot-fill" x="9" y="7" width="46" height="50" rx="5" /><path className="pilot-line" d="M16 17h32M16 27h13M35 27h13M16 37h32M16 47h20" /><circle className="pilot-accent" cx="43" cy="47" r="5" /></>;
    case "torch": return <><circle className="pilot-fill" cx="18" cy="32" r="12" /><path className="pilot-accent" d="m28 24 30-12v40L28 40Z" /><path className="pilot-line" d="M8 32h20" /></>;
    case "flag": return <><path className="pilot-fill" d="M7 20h50L45 48H15Z" /><path className="pilot-line" d="M13 27h38M20 39h24" /><circle className="pilot-accent" cx="32" cy="34" r="5" /></>;
    case "trophy": return <><circle className="pilot-fill" cx="32" cy="32" r="25" /><path className="pilot-accent" d="M32 32 20 10c15-7 25 2 12 22ZM32 32l24 2c-4 16-17 19-24-2ZM32 32 20 54C7 44 11 31 32 32Z" /><circle className="pilot-line-fill" cx="32" cy="32" r="6" /></>;
    case "compass": return <><circle className="pilot-fill" cx="32" cy="32" r="24" /><ellipse className="pilot-line" cx="32" cy="32" rx="14" ry="24" /><ellipse className="pilot-line" cx="32" cy="32" rx="24" ry="10" /><path className="pilot-accent" d="m36 17-3 18-7 11 3-18Z" /></>;
    case "scroll": return <><path className="pilot-fill" d="M12 20h40v25H12Z" /><path className="pilot-line" d="M19 28h25M19 37h16M47 20V9M41 9h12" /><circle className="pilot-accent" cx="47" cy="9" r="5" /></>;
    case "badge": return <><path className="pilot-fill" d="M8 15h48v34H8Z" /><path className="pilot-line" d="m12 20 40 24M52 20 12 44M20 15v34M44 15v34" /><circle className="pilot-accent" cx="32" cy="32" r="6" /></>;
    case "canteen": return <><path className="pilot-fill" d="M10 32c0-12 8-19 22-19s22 7 22 19-8 19-22 19S10 44 10 32Z" /><path className="pilot-line" d="M5 32h54M25 13V7h14v6" /><path className="pilot-accent" d="M26 22h12v20H26Z" /></>;
    case "whistle": return <><path className="pilot-line" d="M7 34h45M12 27v14M52 23v22" /><path className="pilot-fill" d="M7 27h15v14H7ZM48 17h10v30H48Z" /><circle className="pilot-accent" cx="29" cy="34" r="5" /></>;
    case "engine": return <><circle className="pilot-fill" cx="32" cy="32" r="27" /><circle className="pilot-line-fill" cx="32" cy="32" r="7" /><path className="pilot-accent" d="M32 32 18 9c16-6 25 5 14 23ZM32 32l26 2c-4 17-20 21-26-2ZM32 32 17 54C3 43 9 28 32 32Z" /></>;
    case "intake": return <><path className="pilot-fill" d="M6 18h52L49 53H15Z" /><path className="pilot-line-fill" d="M16 27h32l-5 17H21Z" /><path className="pilot-line" d="M6 18h52" /></>;
    case "gauge": return <><rect className="pilot-fill" x="7" y="12" width="50" height="40" rx="5" /><circle className="pilot-line" cx="20" cy="32" r="9" /><circle className="pilot-line" cx="44" cy="32" r="9" /><path className="pilot-accent-line" d="m20 32 4-5M44 32l-5-4" /></>;
    case "afterburner": return <><circle className="pilot-fill" cx="24" cy="32" r="18" /><circle className="pilot-accent" cx="24" cy="32" r="10" /><path className="pilot-flame" d="M34 22c17 3 24 10 25 10-4 3-12 10-25 11 7-7 7-14 0-21Z" /></>;
    case "jetmodel": return <><path className="pilot-fill" d="m32 4 7 20 20 14-3 8-19-7-2 18h-6l-2-18-19 7-3-8 20-14Z" /><path className="pilot-accent" d="m29 29 3-14 3 14-3 9Z" /></>;
    default: return null;
  }
}
