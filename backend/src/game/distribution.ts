export class InvalidDistributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDistributionError';
  }
}

/**
 * Szétoszt `totalUnits` korty-egységet `recipientCount` ember között, amennyire
 * lehet egyenletesen (a maradék az elsők között oszlik el). Legfeljebb annyi
 * címzett lehet, ahány egység van, hogy mindenki kapjon legalább egyet.
 */
export function distributeUnits(totalUnits: number, recipientCount: number): number[] {
  if (recipientCount < 1) {
    throw new InvalidDistributionError('Legalább egy címzett szükséges.');
  }
  if (recipientCount > totalUnits) {
    throw new InvalidDistributionError('Nem lehet több címzett, mint ahány korty-egység van.');
  }
  const base = Math.floor(totalUnits / recipientCount);
  const remainder = totalUnits % recipientCount;
  return Array.from({ length: recipientCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function distributeToPlayers(
  totalUnits: number,
  recipientPlayerIds: readonly string[],
): Record<string, number> {
  const amounts = distributeUnits(totalUnits, recipientPlayerIds.length);
  const result: Record<string, number> = {};
  recipientPlayerIds.forEach((playerId, i) => {
    result[playerId] = (result[playerId] ?? 0) + (amounts[i] as number);
  });
  return result;
}
