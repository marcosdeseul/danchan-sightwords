import type { FieldTripContent } from "../types";

export const FIELD_TRIP_ATTACK_TELEGRAPH_MS = 650;
export const FIELD_TRIP_ATTACK_MS = 1_700;
export const FIELD_TRIP_DEFEND_MS = 1_300;

export interface TripCreature {
  x: number;
  name: string;
  visualKey: string;
  variant: number;
  kind: "wolf" | "dragon" | "flying-dragon";
}

export function spawnCreature(
  creatures: FieldTripContent["creatures"],
  stageId: number,
): TripCreature {
  const names = creatures.length ? creatures : ["monster"];
  const index = Math.floor(Math.random() * names.length);
  const name = names[index] || "monster";
  const kind = creatureKind(name);

  return {
    x: 84 + Math.random() * 8,
    name,
    visualKey: `stage${stageId}-${kind}-${index}`,
    variant: index % 5,
    kind,
  };
}

export function creatureKind(name: string): TripCreature["kind"] {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("flying dragon")) {
    return "flying-dragon";
  }

  return normalizedName.includes("dragon") ? "dragon" : "wolf";
}
