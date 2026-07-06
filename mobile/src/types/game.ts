export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

export function cardKey(card: Card): string {
  return `${card.suit}-${card.rank}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export type SuitColor = 'red' | 'black';
export type BiggerSmallerGuess = 'bigger' | 'smaller';
export type BetweenOutsideGuess = 'between' | 'outside';
export type YesNoGuess = 'yes' | 'no';

export type RoundGuess = SuitColor | BiggerSmallerGuess | BetweenOutsideGuess | Suit | YesNoGuess | Rank;
export type BusGuess = RoundGuess;

export type GamePhase =
  | 'lobby'
  | `round${number}`
  | 'pyramid'
  | 'bus'
  | 'finished';

// ---- Konfigurálható kör-típusok (host testre szabhatja) ----

export const ROUND_TYPES = [
  'redBlack',
  'biggerSmaller',
  'betweenOutside',
  'suit',
  'seenBefore',
  'exactRank',
] as const;
export type RoundType = (typeof ROUND_TYPES)[number];

/** Hány korábban lehúzott lapra van szüksége a kör kiértékeléséhez — ez szabja meg,
 * hányadik pozíciótól kezdve helyezhető el a kör-listában. */
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
  readonly penaltyUnits: number;
}

export interface GameSettings {
  readonly rounds: readonly RoundDefinition[];
  /** A piramis 5 sorának büntetése, alulról (5 lapos sor) fölfelé (csúcs, 1 lap). */
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
export const MIN_PYRAMID_FLIP_INTERVAL_MS = 1500;
export const MAX_PYRAMID_FLIP_INTERVAL_MS = 15000;

export class GameSettingsError extends Error {}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** Ugyanaz a validáció, mint a szerveren — a kliens ezzel ad azonnali visszajelzést,
 * a szerver validál hitelesen (lásd backend/src/game/roundTypes.ts). */
export function validateGameSettings(settings: GameSettings): void {
  if (!Array.isArray(settings.rounds) || settings.rounds.length === 0) {
    throw new GameSettingsError('Legalább egy kör szükséges.');
  }
  if (settings.rounds.length > MAX_ROUNDS) {
    throw new GameSettingsError(`Legfeljebb ${MAX_ROUNDS} kör lehet.`);
  }
  settings.rounds.forEach((round, index) => {
    if (!isPositiveInteger(round.penaltyUnits)) {
      throw new GameSettingsError('Minden kör büntetése legalább 1 egész szám kell legyen.');
    }
    const minPrior = minPriorCardsForRoundType(round.type);
    if (index < minPrior) {
      throw new GameSettingsError(
        `Ez a kör-típus csak legalább ${minPrior}. pozíciótól kezdve helyezhető el.`,
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

export interface RoomPlayer {
  readonly id: string;
  readonly name: string;
  ready: boolean;
  connected: boolean;
}

export const DEFAULT_PENALTY_LABEL = 'Büntetés';

export interface RoomState {
  readonly code: string;
  phase: GamePhase;
  players: RoomPlayer[];
  activePlayerId?: string;
  penaltyLabel: string;
  gameSettings: GameSettings;
}

// ---- Wire (Socket.IO) contract ----

export interface AckResponse {
  readonly ok: boolean;
  readonly error?: string;
}

export interface CreateRoomResponse extends AckResponse {
  readonly roomCode?: string;
  readonly playerId?: string;
}

export interface JoinRoomResponse extends AckResponse {
  readonly playerId?: string;
}

export interface ClientToServerEvents {
  createRoom: (payload: { playerName: string }, ack: (res: CreateRoomResponse) => void) => void;
  joinRoom: (
    payload: { roomCode: string; playerName: string },
    ack: (res: JoinRoomResponse) => void,
  ) => void;
  setReady: (payload: { ready: boolean }, ack: (res: AckResponse) => void) => void;
  setPenaltyLabel: (payload: { label: string }, ack: (res: AckResponse) => void) => void;
  setGameSettings: (payload: { settings: GameSettings }, ack: (res: AckResponse) => void) => void;
  submitGuess: (payload: { guess: RoundGuess }, ack: (res: AckResponse) => void) => void;
  acknowledgePenalty: (ack: (res: AckResponse) => void) => void;
  beginPyramidMatch: (ack: (res: AckResponse) => void) => void;
  cancelPyramidMatch: (ack: (res: AckResponse) => void) => void;
  playPyramidMatch: (
    payload: { suit: string; rank: number; distribution: Record<string, number> },
    ack: (res: AckResponse) => void,
  ) => void;
  acknowledgePyramidDrink: (ack: (res: AckResponse) => void) => void;
  answerBus: (payload: { guess: BusGuess }, ack: (res: AckResponse) => void) => void;
  requestNewRound: (ack: (res: AckResponse) => void) => void;
  leaveRoom: (ack: (res: AckResponse) => void) => void;
}

export interface RoomBroadcastState {
  readonly code: string;
  readonly phase: string;
  readonly players: ReadonlyArray<{
    id: string;
    name: string;
    ready: boolean;
    connected: boolean;
  }>;
  readonly activePlayerId?: string;
  readonly penaltyLabel: string;
  readonly gameSettings: GameSettings;
}

export interface ServerToClientEvents {
  roomUpdated: (state: RoomBroadcastState) => void;
  activePlayerChanged: (payload: { playerId: string; phase: string }) => void;
  guessResolved: (payload: {
    playerId: string;
    card: Card;
    correct: boolean;
    penaltyUnits: number;
  }) => void;
  pyramidCardFlipped: (payload: {
    revealIndex: number;
    rowValue: number;
    card: Card;
    pyramidFinished: boolean;
  }) => void;
  pyramidMatchPlayed: (payload: {
    playerId: string;
    card: Card;
    distribution: Record<string, number>;
  }) => void;
  busRiderSelected: (payload: { riderId: string; deckRemaining: number }) => void;
  busQuestionResolved: (payload: {
    riderId: string;
    question: RoundType;
    card: Card;
    correct: boolean;
    exitedBus: boolean;
    deckRemaining: number;
  }) => void;
  gameFinished: (payload: { riderId: string }) => void;
  errorOccurred: (payload: { message: string }) => void;
}
