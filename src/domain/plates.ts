export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateCount {
  kg: number;
  count: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Plates for one side of the bar, biggest first. Greedy is exact here because 1.25 divides
 * every plate. remainderKg < 0: the load is below the bar; > 0: not buildable exactly.
 */
export function platesPerSide(
  totalKg: number,
  barKg = 20,
): { perSide: PlateCount[]; remainderKg: number } {
  let side = round((totalKg - barKg) / 2);
  if (side < 0) return { perSide: [], remainderKg: round(totalKg - barKg) };
  const perSide: PlateCount[] = [];
  for (const kg of PLATES_KG) {
    const count = Math.floor(side / kg + 1e-9);
    if (count === 0) continue;
    perSide.push({ kg, count });
    side = round(side - count * kg);
  }
  return { perSide, remainderKg: round(side * 2) };
}
