export class InvalidDistributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDistributionError';
  }
}

/**
 * Ellenőrzi, hogy egy játékos által megadott korty-kiosztás érvényes-e:
 * legalább egy címzett van, minden érték legalább 1 egész korty, és az
 * összegük pontosan `totalUnits`. A kliens szabadon dönti el, ki mennyit kap
 * (nem kötelező egyenlő elosztás) — ez csak azt garantálja, hogy a teljes
 * mennyiség kiosztásra kerül, se többet, se kevesebbet.
 */
export function validateDistribution(
  totalUnits: number,
  distribution: Readonly<Record<string, number>>,
): void {
  const entries = Object.entries(distribution);
  if (entries.length === 0) {
    throw new InvalidDistributionError('Legalább egy címzett szükséges.');
  }

  let sum = 0;
  for (const [, units] of entries) {
    if (!Number.isInteger(units) || units < 1) {
      throw new InvalidDistributionError('Minden címzettnek legalább 1 egész kortyot kell adni.');
    }
    sum += units;
  }

  if (sum !== totalUnits) {
    throw new InvalidDistributionError(
      `A kiosztott korty-mennyiségnek pontosan ${totalUnits}-nak kell lennie (jelenleg ${sum}).`,
    );
  }
}
