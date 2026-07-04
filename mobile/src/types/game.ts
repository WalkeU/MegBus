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

export type RoundGuess = SuitColor | BiggerSmallerGuess | BetweenOutsideGuess | Suit;
export type BusGuess = RoundGuess;

export type GamePhase =
  | 'lobby'
  | 'round1'
  | 'round2'
  | 'round3'
  | 'round4'
  | 'pyramid'
  | 'bus'
  | 'finished';

export const BUS_QUESTIONS = ['redBlack', 'biggerSmaller', 'betweenOutside', 'suit'] as const;
export type BusQuestion = (typeof BUS_QUESTIONS)[number];

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
    question: BusQuestion;
    card: Card;
    correct: boolean;
    exitedBus: boolean;
    deckRemaining: number;
  }) => void;
  gameFinished: (payload: { riderId: string }) => void;
  errorOccurred: (payload: { message: string }) => void;
}
