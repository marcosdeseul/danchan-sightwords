import type { TripCreature } from "./app/fieldTrip";

export function MonsterArt({ kind, stageId, variant }: {
  kind: TripCreature["kind"];
  stageId: number;
  variant: number;
}) {
  const accentClass = `monster-accent monster-accent-${variant}`;
  if (kind === "flying-dragon") return <svg className={`trip-monster-art flying-dragon-creature-art stage-creature-${stageId}`} viewBox="0 0 148 104" focusable="false" aria-hidden="true">
    <path className="monster-shadow" d="M25 92c22-8 75-8 96 0 8 4 2 8-48 8s-56-4-48-8Z" /><path className="monster-wing monster-wing-left" d="M67 51C47 13 20 7 5 14l27 17-18 9 43 26Z" /><path className="monster-wing monster-wing-right" d="M77 49c18-35 46-39 63-30l-28 14 18 11-43 22Z" /><path className="monster-tail" d="M52 62C30 61 15 72 7 67c8 18 32 24 55 8Z" /><path className="monster-body" d="M47 44c10-17 42-17 55 0 9 13 4 34-11 43H56c-17-9-20-29-9-43Z" /><path className={accentClass} d="M57 51c9-7 27-7 36 0-2 13-8 23-18 30-10-7-16-17-18-30Z" /><path className="monster-body monster-head" d="M91 35c7-14 28-16 41-5 8 8 3 22-9 27H99c-10-4-13-13-8-22Z" /><path className="monster-crest" d="m98 31-2-16 12 11 9-16 4 19Z" /><path className="monster-snout" d="M118 40h25l-6 13h-22Z" /><path className="monster-leg" d="M59 78l-7 12 13-5M86 78l8 11 5-7" /><circle className="monster-eye" cx="118" cy="34" r="3.5" /><circle className="monster-nose" cx="140" cy="46" r="3" /><path className="monster-mouth" d="M122 50c5 2 10 1 14-2" />
  </svg>;
  if (kind === "dragon") return <svg className={`trip-monster-art dragon-creature-art stage-creature-${stageId}`} viewBox="0 0 124 92" focusable="false" aria-hidden="true">
    <path className="monster-shadow" d="M20 81c16-8 67-8 83 0 7 4 2 8-41 8s-49-4-42-8Z" /><path className="monster-wing" d="M53 43C36 16 14 13 8 14l19 22-14 4 30 20Z" /><path className="monster-tail" d="M39 58C19 56 12 68 5 66c9 12 27 13 44 2Z" /><path className="monster-body" d="M35 43c7-17 38-20 53-5 10 10 11 29 1 39H45c-13-8-18-23-10-34Z" /><path className={accentClass} d="M45 49c9-7 28-7 37 0-2 13-10 21-19 26-10-5-17-13-18-26Z" /><path className="monster-body monster-head" d="M78 28c5-13 25-17 37-6 7 7 5 20-4 27H84c-9-4-11-13-6-21Z" /><path className="monster-crest" d="m84 23-2-15 12 11 8-15 4 17Z" /><path className="monster-leg" d="M45 67v15h12l3-15M76 67l4 15h12l-3-19" /><circle className="monster-eye" cx="101" cy="29" r="3.5" /><path className="monster-mouth" d="M101 39c5 2 9 1 13-2" /><circle className="monster-nose" cx="115" cy="34" r="2.5" />
  </svg>;
  return <svg className={`trip-monster-art wolf-creature-art stage-creature-${stageId}`} viewBox="0 0 124 92" focusable="false" aria-hidden="true">
    <path className="monster-shadow" d="M18 81c16-8 68-8 84 0 7 4 2 8-42 8s-49-4-42-8Z" /><path className="monster-tail" d="M33 55C14 53 9 39 18 27c0 12 9 16 22 18Z" /><path className="monster-body" d="M31 43c11-15 47-17 64-2 10 9 8 27-4 36H42c-13-7-19-22-11-34Z" /><path className={accentClass} d="M43 47c11-7 33-8 45-1-4 9-9 16-18 22-11-4-20-11-27-21Z" /><path className="monster-body monster-head" d="M79 32c5-16 29-20 41-7 7 8 2 22-10 27H87c-9-3-13-11-8-20Z" /><path className="monster-crest" d="m84 26-1-17 15 13 10-15 5 20Z" /><path className="monster-snout" d="M104 36h18l-3 11h-17Z" /><path className="monster-leg" d="M42 65v18h13l3-18M78 65l3 18h13l-2-21" /><circle className="monster-eye" cx="102" cy="29" r="3.5" /><circle className="monster-nose" cx="119" cy="40" r="3" /><path className="monster-mouth" d="M106 45c4 3 8 3 12 1" />
  </svg>;
}
