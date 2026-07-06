/**
 * A körök típuskatalógusa és a szoba-létrehozó által testre szabható
 * "GameSettings" — ez váltja ki a korábbi, fixen 4 körre (piros/fekete →
 * nagyobb/kisebb → közte/kívül → szín) épített feltételezést.
 */
export const ROUND_TYPES = [
  'redBlack',
  'biggerSmaller',
  'betweenOutside',
  'suit',
  'seenBefore',
  'exactRank',
] as const;
export type RoundType = (typeof ROUND_TYPES)[number];

export function isRoundType(value: unknown): value is RoundType {
  return typeof value === 'string' && (ROUND_TYPES as readonly string[]).includes(value);
}

/**
 * Hány korábban (ebben a kör-sorozatban) lehúzott lapra van szüksége a
 * kiértékeléshez — ez szabja meg, hányadik pozíciótól kezdve helyezhető el
 * a kör-listában (pl. "nagyobb/kisebb" nem lehet az 1. kör, mert nincs mihez
 * viszonyítania). `seenBefore`-nál is legalább 1 előző lap kell, különben a
 * kérdés triviálisan mindig "nem" lenne.
 */
export function minPriorCardsForRoundType(type: RoundType): number {
  switch (type) {
    case 'biggerSmaller':
      return 1;
    case 'betweenOutside':
      return 2;
    case 'seenBefore':
      return 1;
    case 'redBlack':
    case 'suit':
    case 'exactRank':
      return 0;
  }
}

export interface RoundDefinition {
  readonly type: RoundType;
  /** Hibás tipp esetén ennyi büntetés-egységet kell "elszenvednie" a játékosnak. */
  readonly penaltyUnits: number;
}

export interface GameSettings {
  readonly rounds: readonly RoundDefinition[];
  /** A piramis 5 sorának büntetés-mennyisége, alulról (5 lapos sor) fölfelé (csúcs, 1 lap). */
  readonly pyramidRowPenalties: readonly [number, number, number, number, number];
  /** Ennyi ezredmásodpercenként fordul automatikusan a következő piramis-lap. */
  readonly pyramidFlipIntervalMs: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  rounds: [
    { type: 'redBlack', penaltyUnits: 1 },
    { type: 'biggerSmaller', penaltyUnits: 2 },
    { type: 'betweenOutside', penaltyUnits: 3 },
    { type: 'suit', penaltyUnits: 4 },
  ],
  pyramidRowPenalties: [1, 2, 3, 4, 5],
  pyramidFlipIntervalMs: 5000,
};

export const MAX_ROUNDS = 8;
export const MIN_PYRAMID_FLIP_INTERVAL_MS = 500;
export const MAX_PYRAMID_FLIP_INTERVAL_MS = 15000;

export class GameSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameSettingsError';
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/**
 * Ellenőrzi, hogy egy host által beküldött `GameSettings` érvényes-e:
 * legalább 1, legfeljebb `MAX_ROUNDS` kör; minden büntetés pozitív egész;
 * minden kör a saját `minPriorCardsForRoundType` megkötésének megfelelő
 * pozíción (vagy azután) szerepel; a piramis pontosan 5 pozitív egészet kap.
 */
export function validateGameSettings(settings: GameSettings): void {
  if (!Array.isArray(settings.rounds) || settings.rounds.length === 0) {
    throw new GameSettingsError('Legalább egy kör szükséges.');
  }
  if (settings.rounds.length > MAX_ROUNDS) {
    throw new GameSettingsError(`Legfeljebb ${MAX_ROUNDS} kör lehet.`);
  }
  settings.rounds.forEach((round, index) => {
    if (!isRoundType(round.type)) {
      throw new GameSettingsError(`Érvénytelen kör-típus: ${String(round.type)}`);
    }
    if (!isPositiveInteger(round.penaltyUnits)) {
      throw new GameSettingsError('Minden kör büntetése legalább 1 egész szám kell legyen.');
    }
    const minPrior = minPriorCardsForRoundType(round.type);
    if (index < minPrior) {
      throw new GameSettingsError(
        `A(z) "${round.type}" típusú kör csak legalább ${minPrior}. pozíciótól kezdve helyezhető el.`,
      );
    }
  });
  if (!Array.isArray(settings.pyramidRowPenalties) || settings.pyramidRowPenalties.length !== 5) {
    throw new GameSettingsError('A piramisnak pontosan 5 sor-büntetést kell megadni.');
  }
  settings.pyramidRowPenalties.forEach((value) => {
    if (!isPositiveInteger(value)) {
      throw new GameSettingsError('A piramis minden sor-büntetése legalább 1 egész szám kell legyen.');
    }
  });
  if (
    !isPositiveInteger(settings.pyramidFlipIntervalMs) ||
    settings.pyramidFlipIntervalMs < MIN_PYRAMID_FLIP_INTERVAL_MS ||
    settings.pyramidFlipIntervalMs > MAX_PYRAMID_FLIP_INTERVAL_MS
  ) {
    throw new GameSettingsError(
      `A piramis fordítási sebessége ${MIN_PYRAMID_FLIP_INTERVAL_MS} és ${MAX_PYRAMID_FLIP_INTERVAL_MS} ezredmásodperc között lehet.`,
    );
  }
}
