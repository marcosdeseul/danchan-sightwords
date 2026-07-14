import type { RewardItem, RewardSlot, StageContent } from "./types";

interface CharacterProps {
  stage: StageContent;
  equippedRewards: RewardItem[];
}

type StageVariant = "ancient" | "roman" | "medieval" | "modern";

export function Character({ stage, equippedRewards }: CharacterProps) {
  return (
    <svg
      className="character-svg"
      viewBox="0 0 220 250"
      role="img"
      aria-label={`${stage.heroName} character`}
    >
      {equippedRewards
        .filter((reward) => reward.slot === "banner" || reward.slot === "cape")
        .map((reward) => <CharacterGearLayer key={reward.id} reward={reward} />)}
      <g className="character-base">
        <path className="character-shadow" d="M58 218c18-12 86-12 104 0 6 4 3 12-52 12s-58-8-52-12Z" />
        <path className="leg left-leg" d="M84 151h24l-5 65H78Z" />
        <path className="leg right-leg" d="M112 151h24l6 65h-26Z" />
        <path className="arm left-arm" d="M72 97c-19 11-28 31-25 49 1 8 13 7 14 0 3-16 9-28 20-36Z" />
        <path className="arm right-arm" d="M148 97c19 11 28 31 25 49-1 8-13 7-14 0-3-16-9-28-20-36Z" />
        <path className="body" d="M75 86h70l12 72c-16 13-78 13-94 0Z" />
        <circle className="head" cx="110" cy="55" r="29" />
        <path className="hair" d="M83 52c5-24 49-33 61 0-17-9-40-11-61 0Z" />
        <circle className="eye" cx="100" cy="57" r="3" />
        <circle className="eye" cx="121" cy="57" r="3" />
        <path className="smile" d="M100 68c7 6 16 6 23 0" />
      </g>
      {equippedRewards
        .filter((reward) => reward.slot !== "banner" && reward.slot !== "cape")
        .map((reward) => <CharacterGearLayer key={reward.id} reward={reward} />)}
    </svg>
  );
}

export function GearIcon({ reward }: { reward: RewardItem }) {
  const variant = variantForReward(reward);

  return (
    <svg
      className={`gear-image gear-image-${reward.slot} gear-variant-${variant}`}
      viewBox="0 0 64 64"
      focusable="false"
      aria-hidden="true"
      data-visual-key={reward.visualKey}
    >
      <GearIconShape slot={reward.slot} variant={variant} />
      <VariantMark reward={reward} />
    </svg>
  );
}

function CharacterGearLayer({ reward }: { reward: RewardItem }) {
  const variant = variantForReward(reward);

  return (
    <g
      data-gear-layer={reward.slot}
      data-visual-key={reward.visualKey}
      className={`gear-layer is-equipped ${reward.slot}-layer gear-variant-${variant}`}
    >
      <CharacterGearShape slot={reward.slot} variant={variant} />
    </g>
  );
}

function CharacterGearShape({ slot, variant }: { slot: RewardSlot; variant: StageVariant }) {
  switch (slot) {
    case "weapon":
      if (variant === "ancient") {
        return (
          <>
            <path className="weapon-handle" d="M156 136 190 84" />
            <path className="weapon-head weapon-stone" d="M178 72c8-8 28-8 38 1l-5 22c-10 7-27 7-38-1Z" />
            <path className="weapon-highlight" d="M187 77c6-3 15-2 21 1" />
            <path className="weapon-binding" d="m181 89 18 11M187 80l21 12" />
            <path className="weapon-grip" d="m155 136 13 8" />
          </>
        );
      }
      if (variant === "roman") {
        return (
          <>
            <path className="weapon-handle" d="M157 135 184 91" />
            <path className="weapon-guard" d="m164 105 28 17" />
            <path className="weapon-blade" d="M194 43c8 13 13 28 13 43l-17 8-11-15c2-14 7-26 15-36Z" />
            <path className="weapon-highlight" d="M195 56c3 8 5 17 5 25" />
            <circle className="weapon-pommel" cx="157" cy="135" r="5" />
            <path className="weapon-grip" d="m170 113 12 7" />
          </>
        );
      }
      if (variant === "medieval") {
        return (
          <>
            <path className="weapon-handle" d="M156 139 179 102" />
            <path className="weapon-guard" d="m161 104 33 20" />
            <path className="weapon-blade" d="M194 44 211 59l-25 48-16-10Z" />
            <path className="weapon-highlight" d="m195 58-17 37" />
            <circle className="weapon-pommel" cx="155" cy="140" r="5" />
            <path className="weapon-gem" d="m177 101 7 4-4 7-7-4Z" />
          </>
        );
      }
      return (
        <>
          <path className="weapon-body" d="M158 113h46l11 10-11 11h-27l-8 22h-16l7-22h-9v-21Z" />
          <path className="weapon-barrel" d="M204 117h24v13h-24Z" />
          <path className="weapon-accent" d="M175 119h19l4 4-4 4h-19Z" />
          <path className="weapon-trigger" d="M169 134c5 7 1 16-7 17" />
          <path className="weapon-highlight" d="M164 119h36M208 122h15" />
          <circle className="weapon-gem" cx="184" cy="126" r="4" />
        </>
      );
    case "boots":
      if (variant === "ancient") {
        return <><path d="M74 205h31l-6 19H66c0-10 4-16 8-19Z" /><path d="M116 205h30c5 4 8 9 8 19h-38Z" /><path d="M80 210l8 7M126 210l8 7" /></>;
      }
      if (variant === "roman") {
        return <><path d="M76 205h29v19H68c0-8 4-13 8-16Z" /><path d="M116 205h29c5 3 8 8 8 19h-37Z" /><path d="M82 205v19M94 205v19M122 205v19M134 205v19" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M78 177h28l-5 47H70c0-9 4-15 8-18Z" /><path d="M114 177h28l7 47h-35Z" /><path d="M82 188h20M118 188h20M80 204h21M119 204h22" /></>;
      }
      return <><path d="M75 200h31v24H66c0-9 4-15 9-18Z" /><path d="M115 200h31c5 3 9 9 9 24h-40Z" /><path d="M72 218h31M118 218h31" /><path d="M86 200l5-10M132 200l5-10" /></>;
    case "shield":
      if (variant === "roman") {
        return <><path d="M24 116h48v75H24Z" /><path d="M48 121v65" /><circle cx="48" cy="154" r="9" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M48 112l31 12v29c0 23-17 36-31 43-14-7-31-20-31-43v-29Z" /><path d="M48 124v61" /><path d="M27 151h42" /></>;
      }
      return <><path d="M48 119l28 10v24c0 20-15 33-28 39-13-6-28-19-28-39v-24Z" /><path d="M48 129v50" /></>;
    case "radio":
      return (
        <>
          <path className="radio-body" d="M27 116h40c5 0 8 3 8 8v53c0 5-3 8-8 8H27c-5 0-8-3-8-8v-53c0-5 3-8 8-8Z" />
          <path className="radio-antenna" d="M61 117 76 92" />
          <path className="radio-screen" d="M31 128h26v17H31Z" />
          <path className="radio-speaker" d="M33 158h29M33 168h24" />
          <circle className="radio-button" cx="63" cy="139" r="5" />
        </>
      );
    case "cape":
      if (variant === "ancient") {
        return <><path d="M82 86h56l22 106-20-13-16 21-17-20-19 20-14-22-20 14Z" /><path d="M88 96c13 8 31 8 44 0" /></>;
      }
      if (variant === "roman") {
        return <><path d="M79 84h62l17 111H70Z" /><path d="M84 92c18 10 37 10 54 0" /><circle cx="88" cy="93" r="6" /><circle cx="135" cy="93" r="6" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M77 85h66l27 117H50Z" /><path d="M80 96c20 13 41 13 61 0" /><path d="M108 101v96" /></>;
      }
      return <><path d="M93 96h34l15 86H78Z" /><path d="M89 112h44M82 154h56" /></>;
    case "armor":
      if (variant === "ancient") {
        return <><path d="M82 92h56l9 61c-13 9-62 9-75 0Z" /><path d="M91 103h38M90 120h40M91 137h38" /></>;
      }
      if (variant === "roman") {
        return <><path d="M78 89h64l13 68c-16 12-74 12-90 0Z" /><path d="M91 93v65M110 93v68M129 93v65" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M78 88h64l12 70c-16 13-72 13-88 0Z" /><path d="M96 94v64M124 94v64M82 118h56" /></>;
      }
      return <><path d="M82 91h58l10 60c-13 10-65 10-78 0Z" /><path d="M96 103h28M90 128h40" /></>;
    case "belt":
      if (variant === "ancient") {
        return <><path d="M69 138c24 9 58 9 82 0" /><circle cx="103" cy="145" r="7" /><path d="M109 150l16 14" /></>;
      }
      if (variant === "roman") {
        return <><path d="M68 136h84v16H68Z" /><path d="M101 132h20v24h-20Z" /><path d="M82 153v18M98 153v18M122 153v18M138 153v18" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M66 135h88v18H66Z" /><path d="M99 130h24v28H99Z" /><path d="M75 153l-8 17M145 153l8 17" /></>;
      }
      return <><path d="M66 136h88v19H66Z" /><path d="M78 155v24h17v-24M125 155v24h17v-24" /><path d="M102 132h18v27h-18Z" /></>;
    case "gloves":
      if (variant === "ancient") {
        return <><circle cx="54" cy="146" r="12" /><circle cx="166" cy="146" r="12" /><path d="M48 144c5 5 9 5 13 0M160 144c5 5 9 5 13 0" /></>;
      }
      if (variant === "roman") {
        return <><path d="M43 134h24l3 23H46Z" /><path d="M153 134h24l-3 23h-24Z" /><path d="M47 143h18M155 143h18" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M42 138l19-8 13 14-8 17H47Z" /><path d="M178 138l-19-8-13 14 8 17h19Z" /><path d="M49 148h18M153 148h18" /></>;
      }
      return <><path d="M42 137h25l6 18-10 10H47Z" /><path d="M178 137h-25l-6 18 10 10h16Z" /><circle cx="55" cy="150" r="5" /><circle cx="165" cy="150" r="5" /></>;
    case "helmet":
      if (variant === "ancient") {
        return <><path d="M78 53 88 31l15-12 15 9 14-5 10 30Z" /><path d="M80 53h60" /><path d="M91 42h12M119 42h12" /></>;
      }
      if (variant === "roman") {
        return <><path d="M78 53c4-35 60-35 64 0Z" /><path d="M75 53h70" /><path d="M110 13v39" /><path d="M94 21c12-9 20-9 32 0" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M78 52c5-34 59-34 64 0Z" /><path d="M82 51h56v22H82Z" /><path d="M92 59h36M110 52v21" /></>;
      }
      if (variant === "modern") {
        return <><path d="M78 51c7-30 58-30 64 0Z" /><path d="M82 50h56" /><path d="M124 53h24" /><path d="M93 42h34" /></>;
      }
      return null;
    case "banner":
      if (variant === "ancient") {
        return <><path d="M164 38v168" /><path d="M164 44h34l-7 19 9 18h-36Z" /><path d="M171 54l16 14M188 54l-17 18" /></>;
      }
      if (variant === "roman") {
        return <><path d="M164 35v172" /><path d="M145 47h38v45h-38Z" /><path d="M164 44v52M151 69h26" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M164 38v168" /><path d="M164 42h42v56l-21-12-21 12Z" /><path d="M176 56h18M176 70h18" /></>;
      }
      return <><path d="M164 38v168" /><path d="M164 42h42v16h-42Z" /><path d="M164 66h36v16h-36Z" /><path d="M164 90h42v16h-42Z" /></>;
    case "crown":
      if (variant === "ancient") {
        return <><path d="M85 48h50l-7-18-18-16-18 16Z" /><path d="M110 13v34M90 31l40 0M93 49h34" /></>;
      }
      if (variant === "roman") {
        return <><path d="M81 46c12-23 46-23 58 0" /><path d="M89 42c7 8 34 8 42 0" /><path d="M91 38l-9-9M101 34l-5-12M119 34l5-12M129 38l9-9" /></>;
      }
      if (variant === "medieval") {
        return <><path d="M83 31 96 14l14 17 14-17 13 17-6 18H89Z" /><path d="M88 49h44" /></>;
      }
      if (variant === "modern") {
        return <><path d="M82 31h56v20H82Z" /><path d="M86 31c8-16 42-16 50 0" /><path d="M122 52h23" /></>;
      }
      return null;
    case "medal":
      return <><circle cx="110" cy="122" r="10" /><path d="M101 92h18l-6 22h-6Z" /></>;
    case "gem":
      return <path d="M94 104h32l8 15-24 31-24-31Z" />;
    case "pack":
      return <><path d="M76 94h22v55H76Z" /><path d="M79 105h16M78 130h17" /></>;
    case "lantern":
      return <><path d="M143 120h24l-4 35h-16Z" /><path d="M150 130c8 6 8 14 0 20" /></>;
    case "crest":
      return <><path d="M99 98h22l7 21-18 19-18-19Z" /><path d="M110 103v28" /></>;
    case "star":
      return <path d="m110 94 8 17 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2Z" />;
    case "map":
      return <><path d="M76 96l19-7 17 7 19-7v50l-19 7-17-7-19 7Z" /><path d="M95 89v50M112 96v50" /></>;
    case "torch":
      return <><path d="M164 102v56" /><path d="M154 96h20l-5 13h-10Z" /><path d="M164 72c13 14 8 25 0 25s-13-11 0-25Z" /></>;
    case "flag":
      return <><path d="M164 38v168" /><path d="M164 42h39l-11 18 11 18h-39Z" /></>;
    case "trophy":
      return <><path d="M96 100h28v25c0 11-6 20-14 20s-14-9-14-20Z" /><path d="M110 145v20M96 168h28" /></>;
    case "compass":
      return <><circle cx="110" cy="121" r="17" /><path d="m116 107-6 20-7 8 5-20Z" /></>;
    case "scroll":
      return <><path d="M88 104h44v38H88Z" /><path d="M96 116h28M96 128h28" /></>;
    case "badge":
      return <><path d="m110 94 8 13 15 4-10 12 1 16-14-7-14 7 1-16-10-12 15-4Z" /><circle cx="110" cy="119" r="8" /></>;
    case "canteen":
      return <><path d="M96 95h28v12c9 4 15 13 15 24 0 16-13 26-29 26s-29-10-29-26c0-11 6-20 15-24Z" /><path d="M96 95h28" /></>;
    case "whistle":
      return <><path d="M89 126c0-17 13-30 30-30h25v20h-20c7 15-4 35-22 35-8 0-13-7-13-25Z" /><circle cx="108" cy="133" r="8" /></>;
    default:
      return null;
  }
}

function GearIconShape({ slot, variant }: { slot: RewardSlot; variant: StageVariant }) {
  const common = {
    fill: "var(--gear-fill)",
    stroke: "var(--gear-stroke)",
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const accent = {
    fill: "var(--gear-accent)",
    stroke: "var(--gear-stroke)",
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const none = {
    fill: "none",
    stroke: "var(--gear-stroke)",
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (slot) {
    case "weapon":
      if (variant === "ancient") {
        return (
          <>
            <path {...none} d="M18 53 43 22" />
            <path {...common} d="M34 13c6-7 21-7 27 0l-4 18c-7 5-20 5-27 0Z" />
            <path {...none} d="M38 17c5-2 12-2 17 0M35 27l14 8M42 21l15 8M16 45l9 8" />
          </>
        );
      }
      if (variant === "roman") {
        return (
          <>
            <path {...none} d="M18 53 39 28" />
            <path {...none} d="M27 30 44 45" />
            <path fill="#f8fafc" stroke="var(--gear-stroke)" strokeWidth="4" strokeLinejoin="round" d="M43 7c7 10 11 22 10 34l-13 7-8-12c1-11 5-21 11-29Z" />
            <path {...none} strokeWidth={3} d="M43 17c3 7 4 14 4 21M31 39l8 7" />
            <circle fill="var(--gear-accent)" stroke="var(--gear-stroke)" strokeWidth="3" cx="18" cy="53" r="4" />
          </>
        );
      }
      if (variant === "medieval") {
        return (
          <>
            <path {...none} d="M17 54 36 32" />
            <path {...none} d="M25 32 44 49" />
            <path fill="#f8fafc" stroke="var(--gear-stroke)" strokeWidth="4" strokeLinejoin="round" d="M45 7 57 18 38 43 27 33Z" />
            <path {...none} strokeWidth={3} d="M46 16 35 36" />
            <circle fill="var(--gear-accent)" stroke="var(--gear-stroke)" strokeWidth="3" cx="17" cy="54" r="4" />
          </>
        );
      }
      return (
        <>
          <path {...common} d="M10 25h34l8 7-8 8H27l-5 16H11l5-16h-6Z" />
          <path {...accent} d="M44 28h16v9H44Z" />
          <path {...none} strokeWidth={3} d="M17 31h23M47 32h9M25 40c5 6 2 12-5 14" />
          <circle fill="var(--gear-accent)" stroke="var(--gear-stroke)" strokeWidth="3" cx="32" cy="32" r="4" />
        </>
      );
    case "boots":
      if (variant === "ancient") {
        return <><path {...common} d="M14 20h15l-4 28H9c0-8 2-14 5-18Z" /><path {...common} d="M36 20h14l5 10v18H36Z" /><path {...none} d="M17 26l8 7M40 26l8 7" /></>;
      }
      if (variant === "roman") {
        return <><path {...common} d="M14 19h15v29H9c0-7 2-12 5-16Z" /><path {...common} d="M36 19h15l4 13v16H36Z" /><path {...none} d="M18 20v28M25 20v28M40 20v28M47 20v28M11 36h17M36 36h18" /></>;
      }
      if (variant === "medieval") {
        return <><path {...common} d="M15 10h16l-5 38H9c0-8 2-14 6-18Z" /><path {...common} d="M35 10h16l5 38H35Z" /><path {...none} d="M17 23h11M37 23h11M15 36h12M37 36h13" /></>;
      }
      return <><path {...common} d="M14 18h16v30H8c0-7 3-13 7-17Z" /><path {...common} d="M35 18h16l5 13v17H35Z" /><path {...none} d="M10 43h19M36 43h19M19 18l3-8M43 18l3-8" /></>;
    case "shield":
      if (variant === "roman") {
        return <><path {...common} d="M15 9h34v49H15Z" /><path {...none} d="M32 13v41" /><circle fill="var(--gear-accent)" stroke="none" cx="32" cy="32" r="5" /></>;
      }
      if (variant === "medieval") {
        return <><path {...common} d="M32 7 52 15v16c0 14-10 23-20 28-10-5-20-14-20-28V15Z" /><path {...none} d="M32 15v34M19 32h26" /></>;
      }
      return <><path {...common} d="M32 7 51 14v17c0 14-9 23-19 28-10-5-19-14-19-28V14Z" /><path {...none} d="M32 15v34" /></>;
    case "radio":
      return (
        <>
          <path {...common} className="radio-body" d="M18 16h28c4 0 7 3 7 7v30c0 4-3 7-7 7H18c-4 0-7-3-7-7V23c0-4 3-7 7-7Z" />
          <path {...none} className="radio-antenna" d="M43 16 56 4" />
          <path {...accent} className="radio-screen" d="M20 25h17v11H20Z" />
          <path {...none} className="radio-speaker" d="M21 45h21M21 52h16" />
          <circle fill="var(--gear-accent)" stroke="var(--gear-stroke)" strokeWidth="3" className="radio-button" cx="45" cy="33" r="4" />
        </>
      );
    case "cape":
      if (variant === "ancient") {
        return <><path {...common} d="M21 12h22l9 41-10-7-8 10-8-10-9 10-5-11-9 8Z" /><path {...none} d="M22 14c5 5 15 5 20 0" /></>;
      }
      if (variant === "roman") {
        return <><path {...common} d="M18 10h28l8 47H12Z" /><path {...none} d="M19 14c7 7 20 7 27 0" /><circle fill="var(--gear-accent)" stroke="none" cx="21" cy="16" r="4" /><circle fill="var(--gear-accent)" stroke="none" cx="44" cy="16" r="4" /></>;
      }
      if (variant === "medieval") {
        return <><path {...common} d="M18 11h28l12 46H6Z" /><path {...none} d="M19 15c8 8 19 8 27 0M32 16v39" /></>;
      }
      return <><path {...common} d="M23 16h18l10 38H13Z" /><path {...none} d="M19 30h27M16 44h33" /></>;
    case "armor":
      if (variant === "ancient") {
        return <><path {...common} d="M19 11h26l7 39-20 8-20-8Z" /><path {...none} d="M21 24h22M19 35h26M21 46h22" /></>;
      }
      if (variant === "roman") {
        return <><path {...common} d="M18 8h28l8 43-22 8-22-8Z" /><path {...none} d="M24 13v40M32 10v46M40 13v40" /></>;
      }
      if (variant === "medieval") {
        return <><path {...common} d="M19 8h26l9 43-22 8-22-8Z" /><path {...none} d="M32 12v43M20 29h24" /><circle fill="var(--gear-accent)" stroke="none" cx="32" cy="32" r="5" /></>;
      }
      return <><path {...common} d="M20 10h24l7 40-19 8-19-8Z" /><path {...none} d="M22 30h20M26 43h12" /><path fill="var(--gear-accent)" stroke="none" d="M23 17h18v7H23Z" /></>;
    case "belt":
      if (variant === "ancient") {
        return <><path {...none} d="M8 31c13 8 35 8 48 0" /><circle fill="var(--gear-accent)" stroke="var(--gear-stroke)" strokeWidth="3" cx="31" cy="33" r="7" /><path {...none} d="M36 37l11 12" /></>;
      }
      if (variant === "roman") {
        return <><path {...common} d="M8 24h48v14H8Z" /><path {...accent} d="M24 20h16v22H24Z" /><path {...none} d="M14 39v13M25 39v13M39 39v13M50 39v13" /></>;
      }
      if (variant === "medieval") {
        return <><path {...common} d="M7 24h50v16H7Z" /><path {...accent} d="M23 19h18v25H23Z" /><path {...none} d="M11 40l-5 12M53 40l5 12" /></>;
      }
      return <><path {...common} d="M7 24h50v16H7Z" /><path {...accent} d="M24 20h16v24H24Z" /><path {...none} d="M13 40v15h12V40M39 40v15h12V40" /></>;
    case "gloves":
      if (variant === "ancient") {
        return <><path {...common} d="M13 20c9-6 19 3 15 16l-4 13H12l-4-16c-1-5 1-10 5-13Z" /><path {...common} d="M51 20c-9-6-19 3-15 16l4 13h12l4-16c1-5-1-10-5-13Z" /><path {...none} d="M15 30c3 4 7 4 10 0M39 30c3 4 7 4 10 0" /></>;
      }
      if (variant === "roman") {
        return <><path {...common} d="M10 18h18l4 30H12Z" /><path {...common} d="M54 18H36l-4 30h20Z" /><path {...none} d="M13 28h16M35 28h16" /></>;
      }
      if (variant === "medieval") {
        return <><path {...common} d="M10 25 25 16l13 13-8 20H12Z" /><path {...common} d="M54 25 39 16 26 29l8 20h18Z" /><path {...none} d="M15 34h17M32 34h17" /></>;
      }
      return <><path {...common} d="M10 21h19l5 18-9 12H12Z" /><path {...common} d="M54 21H35l-5 18 9 12h13Z" /><circle fill="var(--gear-accent)" stroke="none" cx="21" cy="35" r="4" /><circle fill="var(--gear-accent)" stroke="none" cx="43" cy="35" r="4" /></>;
    case "helmet":
      if (variant === "ancient") {
        return <><path {...common} d="M12 33 20 15l11-7 11 8 10-4 6 21Z" /><path {...accent} d="M10 32h45v9H10Z" /><path {...none} d="M20 25h8M38 25h8" /></>;
      }
      if (variant === "roman") {
        return <><path {...common} d="M13 32c0-28 38-28 38 0Z" /><path {...accent} d="M9 31h46v10H9Z" /><path {...none} d="M32 7v24M22 16c7-5 13-5 20 0" /></>;
      }
      if (variant === "medieval") {
        return <><path {...common} d="M13 31c0-27 38-27 38 0Z" /><path {...accent} d="M12 31h40v16H12Z" /><path {...none} d="M20 39h24M32 31v16" /></>;
      }
      return <><path {...common} d="M12 31c4-25 36-25 40 0Z" /><path {...accent} d="M9 31h46v9H9Z" /><path {...none} d="M39 36h17M21 23h22" /></>;
    case "banner":
      if (variant === "ancient") {
        return <><path {...none} d="M17 9v48" /><path {...accent} d="M17 12h31l-6 11 7 12H17Z" /><path {...none} d="M25 19l15 11M40 19 25 31M17 57h22" /></>;
      }
      if (variant === "roman") {
        return <><path {...none} d="M32 8v49M19 57h26" /><path {...accent} d="M16 13h32v34H16Z" /><path {...none} d="M32 13v34M22 30h20" /></>;
      }
      if (variant === "medieval") {
        return <><path {...none} d="M17 9v48" /><path {...accent} d="M17 11h36v41L35 42 17 52Z" /><path {...none} d="M27 21h16M27 31h16" /></>;
      }
      return <><path {...none} d="M17 9v48" /><path {...accent} d="M17 12h36v10H17ZM17 29h31v10H17ZM17 46h36v10H17Z" /></>;
    case "crown":
      if (variant === "ancient") {
        return <><path {...accent} d="M9 46h46L45 24 32 9 19 24Z" /><path {...none} d="M32 10v35M16 31h32M14 46h36" /></>;
      }
      if (variant === "roman") {
        return <><path {...none} d="M13 42c8-21 30-21 38 0M18 40c8 7 20 7 28 0" /><path fill="var(--gear-accent)" stroke="none" d="M17 35 10 28l9 1ZM27 32l-4-11 8 8ZM37 32l4-11-8 8ZM47 35l7-7-9 1Z" /></>;
      }
      if (variant === "medieval") {
        return <><path {...accent} d="M8 47h48l-5-28-12 13-7-18-7 18-12-13Z" /><path {...none} d="M13 47h38" /></>;
      }
      return <><path {...accent} d="M10 45h44V29H10Z" /><path {...none} d="M15 29c7-14 27-14 34 0M38 45h17" /></>;
    case "medal":
      return <><path {...common} d="M22 7h20l-6 22h-8Z" /><circle {...accent} cx="32" cy="42" r="14" /><path {...none} d="m28 42 3 3 6-7" /></>;
    case "gem":
      return <><path {...common} d="M17 12h30l9 15-24 30L8 27Z" /><path {...none} d="M17 12 32 57 47 12M8 27h48" /></>;
    case "pack":
      return <><path {...common} d="M17 19h30v36H17Z" /><path {...none} d="M24 19v-5h16v5M17 31h30M23 38h18" /></>;
    case "lantern":
      return <><path {...none} d="M23 14c0-7 18-7 18 0M32 7v8" /><path {...common} d="M18 20h28l-4 34H22Z" /><path fill="var(--gear-accent)" stroke="none" d="M28 31c8 6 9 13 1 18 11-2 14-10 7-19 1 8-6 7-8 1Z" /></>;
    case "crest":
      return <><path {...common} d="M32 7 52 16v16c0 14-10 22-20 27-10-5-20-13-20-27V16Z" /><path fill="var(--gear-accent)" stroke="none" d="m32 19 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z" /></>;
    case "star":
      return <path {...accent} d="m32 7 7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 24l16-2Z" />;
    case "map":
      return <><path {...common} d="M10 14 25 9l14 5 15-5v41l-15 5-14-5-15 5Z" /><path {...none} d="M25 9v41M39 14v41M18 25h9M37 34h9" /></>;
    case "torch":
      return <><path {...none} d="M32 29v28M24 57h16" /><path {...common} d="M24 25h16l-4 10h-8Z" /><path fill="var(--gear-accent)" stroke="var(--gear-stroke)" strokeWidth="3" strokeLinejoin="round" d="M32 6c12 12 8 22 0 22-8 0-12-10 0-22Z" /></>;
    case "flag":
      return <><path {...none} d="M16 8v49M16 57h26" /><path {...accent} d="M16 10h36l-8 13 8 13H16Z" /></>;
    case "trophy":
      return <><path {...accent} d="M19 10h26v14c0 10-6 18-13 18s-13-8-13-18Z" /><path {...none} d="M19 18H9c0 9 5 15 12 15M45 18h10c0 9-5 15-12 15M32 42v10M22 56h20" /></>;
    case "compass":
      return <><circle {...common} cx="32" cy="32" r="22" /><path {...accent} d="m39 17-6 20-8 10 6-20Z" /><path {...none} d="M32 10v7M32 47v7M10 32h7M47 32h7" /></>;
    case "scroll":
      return <><path {...common} d="M17 14h31v35H17Z" /><path {...none} d="M17 14c-8 0-8 12 0 12M48 49c8 0 8-12 0-12M24 25h17M24 34h17" /></>;
    case "badge":
      return <><path {...accent} d="m32 8 7 12 14 3-9 11 1 15-13-6-13 6 1-15-9-11 14-3Z" /><circle fill="var(--gear-fill)" stroke="var(--gear-stroke)" strokeWidth="3" cx="32" cy="31" r="8" /></>;
    case "canteen":
      return <><path {...common} d="M25 9h14v10c8 3 13 11 13 20 0 11-9 18-20 18s-20-7-20-18c0-9 5-17 13-20Z" /><path {...none} d="M25 9h14M24 30h16M22 41h20" /></>;
    case "whistle":
      return <><path {...accent} d="M12 33c0-11 9-20 20-20h17v15H36c5 10-2 23-14 23-6 0-10-5-10-18Z" /><circle fill="var(--gear-fill)" stroke="var(--gear-stroke)" strokeWidth="3" cx="26" cy="37" r="7" /><path {...none} d="M49 13h6M49 28h6" /></>;
    default:
      return null;
  }
}

function VariantMark({ reward }: { reward: RewardItem }) {
  const variant = variantForReward(reward);

  if (variant === "ancient") {
    return <circle fill="var(--gear-accent)" stroke="none" cx="50" cy="50" r="4" />;
  }

  if (variant === "roman") {
    return <path fill="none" stroke="var(--gear-accent)" strokeWidth="3" strokeLinecap="round" d="M12 54c7-6 33-6 40 0" />;
  }

  if (variant === "medieval") {
    return <path fill="var(--gear-accent)" stroke="none" d="m51 49 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" />;
  }

  return <><circle fill="var(--gear-accent)" stroke="none" cx="51" cy="49" r="3" /><circle fill="var(--gear-accent)" stroke="none" cx="57" cy="55" r="2" /></>;
}

function variantForReward(reward: RewardItem): StageVariant {
  if (reward.stageId === 1) {
    return "ancient";
  }

  if (reward.stageId === 2) {
    return "roman";
  }

  if (reward.stageId === 3) {
    return "medieval";
  }

  return "modern";
}
