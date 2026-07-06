import {
  DEFAULT_GAME_SETTINGS,
  GameSettings,
  GameSettingsError,
  MAX_PYRAMID_FLIP_INTERVAL_MS,
  MAX_ROUNDS,
  MIN_PYRAMID_FLIP_INTERVAL_MS,
  minPriorCardsForRoundType,
  validateGameSettings,
} from '../game/roundTypes';
import { evaluateExactRank, evaluateSeenBefore } from '../game/rounds';
import { card } from './testUtils';

describe('minPriorCardsForRoundType', () => {
  it('a nagyobb/kisebb 1, a közte/kívül 2, a volt-e-már 1 előző lapot igényel', () => {
    expect(minPriorCardsForRoundType('biggerSmaller')).toBe(1);
    expect(minPriorCardsForRoundType('betweenOutside')).toBe(2);
    expect(minPriorCardsForRoundType('seenBefore')).toBe(1);
  });

  it('a piros/fekete, szín és pontos érték semmilyen előző lapot nem igényel', () => {
    expect(minPriorCardsForRoundType('redBlack')).toBe(0);
    expect(minPriorCardsForRoundType('suit')).toBe(0);
    expect(minPriorCardsForRoundType('exactRank')).toBe(0);
  });
});

describe('evaluateSeenBefore', () => {
  it('"yes"-t vár, ha a rang már szerepelt a korábbi lapok közt', () => {
    const prior = [card(9, 'hearts'), card(4, 'clubs')];
    expect(evaluateSeenBefore(prior, card(9, 'spades'), 'yes')).toBe(true);
    expect(evaluateSeenBefore(prior, card(9, 'spades'), 'no')).toBe(false);
  });

  it('"no"-t vár, ha a rang még nem szerepelt', () => {
    const prior = [card(9, 'hearts'), card(4, 'clubs')];
    expect(evaluateSeenBefore(prior, card(7, 'spades'), 'no')).toBe(true);
    expect(evaluateSeenBefore(prior, card(7, 'spades'), 'yes')).toBe(false);
  });
});

describe('evaluateExactRank', () => {
  it('csak a pontosan eltalált rangnál igaz', () => {
    expect(evaluateExactRank(card(11), 11)).toBe(true);
    expect(evaluateExactRank(card(11), 10)).toBe(false);
  });
});

describe('validateGameSettings', () => {
  it('az alapértelmezett beállítást elfogadja', () => {
    expect(() => validateGameSettings(DEFAULT_GAME_SETTINGS)).not.toThrow();
  });

  it('elfogad egy egyedi, érvényes sorrendet (pl. szín, piros/fekete, volt-e-már, pontos érték)', () => {
    const settings: GameSettings = {
      rounds: [
        { type: 'suit', penaltyUnits: 1 },
        { type: 'redBlack', penaltyUnits: 1 },
        { type: 'seenBefore', penaltyUnits: 2 },
        { type: 'exactRank', penaltyUnits: 5 },
      ],
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).not.toThrow();
  });

  it('hibát dob, ha nincs egy kör sem', () => {
    const settings: GameSettings = {
      rounds: [],
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it(`hibát dob, ha több mint ${MAX_ROUNDS} kör van`, () => {
    const settings: GameSettings = {
      rounds: Array.from({ length: MAX_ROUNDS + 1 }, () => ({ type: 'redBlack' as const, penaltyUnits: 1 })),
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('hibát dob nem pozitív egész büntetésnél', () => {
    const settings: GameSettings = {
      rounds: [{ type: 'redBlack', penaltyUnits: 0 }],
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('hibát dob, ha "nagyobb/kisebb" van az 1. pozícióban (nincs mihez viszonyítani)', () => {
    const settings: GameSettings = {
      rounds: [{ type: 'biggerSmaller', penaltyUnits: 1 }],
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('hibát dob, ha "közte/kívül" csak 1 előző kör után van (2 kell)', () => {
    const settings: GameSettings = {
      rounds: [
        { type: 'redBlack', penaltyUnits: 1 },
        { type: 'betweenOutside', penaltyUnits: 2 },
      ],
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('elfogadja a "közte/kívül"-t, ha legalább 2 kör előzi meg', () => {
    const settings: GameSettings = {
      rounds: [
        { type: 'redBlack', penaltyUnits: 1 },
        { type: 'suit', penaltyUnits: 1 },
        { type: 'betweenOutside', penaltyUnits: 2 },
      ],
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).not.toThrow();
  });

  it('hibát dob, ha "volt-e-már" az 1. pozícióban van', () => {
    const settings: GameSettings = {
      rounds: [{ type: 'seenBefore', penaltyUnits: 1 }],
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('hibát dob, ha a piramis nem pontosan 5 sor-büntetést kap', () => {
    const settings = {
      rounds: DEFAULT_GAME_SETTINGS.rounds,
      pyramidRowPenalties: [1, 2, 3, 4],
    } as unknown as GameSettings;
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('hibát dob nem pozitív egész piramis-büntetésnél', () => {
    const settings: GameSettings = {
      rounds: DEFAULT_GAME_SETTINGS.rounds,
      pyramidRowPenalties: [1, 2, 0, 4, 5],
      pyramidFlipIntervalMs: 5000,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('hibát dob, ha a piramis fordítási sebessége a megengedett tartomány alatt van', () => {
    const settings: GameSettings = {
      rounds: DEFAULT_GAME_SETTINGS.rounds,
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: MIN_PYRAMID_FLIP_INTERVAL_MS - 1,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('hibát dob, ha a piramis fordítási sebessége a megengedett tartomány felett van', () => {
    const settings: GameSettings = {
      rounds: DEFAULT_GAME_SETTINGS.rounds,
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: MAX_PYRAMID_FLIP_INTERVAL_MS + 1,
    };
    expect(() => validateGameSettings(settings)).toThrow(GameSettingsError);
  });

  it('elfogadja a tartomány szélső értékeit', () => {
    const settings: GameSettings = {
      rounds: DEFAULT_GAME_SETTINGS.rounds,
      pyramidRowPenalties: [1, 2, 3, 4, 5],
      pyramidFlipIntervalMs: MIN_PYRAMID_FLIP_INTERVAL_MS,
    };
    expect(() => validateGameSettings(settings)).not.toThrow();
  });
});
