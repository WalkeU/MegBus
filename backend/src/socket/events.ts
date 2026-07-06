import { BusGuess } from '../game/busRound';
import { RoundGuess } from '../game/gameEngine';
import { GameSettings, RoundType } from '../game/roundTypes';
import { Rank, Suit } from '../game/types';

export interface WireCard {
  readonly suit: Suit;
  readonly rank: Rank;
}

/** Kliens → szerver események. */
export interface ClientToServerEvents {
  createRoom: (payload: { playerName: string }, ack: (response: CreateRoomResponse) => void) => void;
  joinRoom: (
    payload: { roomCode: string; playerName: string },
    ack: (response: JoinRoomResponse) => void,
  ) => void;
  setReady: (payload: { ready: boolean }, ack: (response: AckResponse) => void) => void;
  /** Csak a szoba létrehozója hívhatja, csak a váróteremben — mindenki ugyanazt a nevet látja. */
  setPenaltyLabel: (payload: { label: string }, ack: (response: AckResponse) => void) => void;
  /** Csak a szoba létrehozója hívhatja, csak a váróteremben — a körök típusa/sorrendje/
   * büntetése és a piramis-sorok büntetése állítható vele. */
  setGameSettings: (payload: { settings: GameSettings }, ack: (response: AckResponse) => void) => void;
  submitGuess: (payload: { guess: RoundGuess }, ack: (response: AckResponse) => void) => void;
  /** Nyugtázza a hibás tippért járó büntetést — csak ez engedi tovább a kört a következő játékosra/körre. */
  acknowledgePenalty: (ack: (response: AckResponse) => void) => void;
  /** Jelzi, hogy a játékos épp egy piramis-lap lerakását fontolgatja — erre a fordítás szünetel. */
  beginPyramidMatch: (ack: (response: AckResponse) => void) => void;
  /** Visszavonja a beginPyramidMatch-et (a játékos meggondolta magát); ha nincs más várakozó, folytatódik a fordítás. */
  cancelPyramidMatch: (ack: (response: AckResponse) => void) => void;
  playPyramidMatch: (
    payload: { suit: string; rank: number; distribution: Record<string, number> },
    ack: (response: AckResponse) => void,
  ) => void;
  /** Nyugtázza a piramis-lerakásból kapott büntetést — amíg valamelyik címzett nem nyugtázza, a fordítás szünetel. */
  acknowledgePyramidDrink: (ack: (response: AckResponse) => void) => void;
  answerBus: (payload: { guess: BusGuess }, ack: (response: AckResponse) => void) => void;
  requestNewRound: (ack: (response: AckResponse) => void) => void;
  leaveRoom: (ack: (response: AckResponse) => void) => void;
}

/** Szerver → kliens események (broadcast a szoba minden tagjának). */
export interface ServerToClientEvents {
  roomUpdated: (state: RoomBroadcastState) => void;
  activePlayerChanged: (payload: { playerId: string; phase: string }) => void;
  guessResolved: (
    payload: { playerId: string; card: WireCard; correct: boolean; penaltyUnits: number },
  ) => void;
  pyramidCardFlipped: (
    payload: { revealIndex: number; rowValue: number; card: WireCard; pyramidFinished: boolean },
  ) => void;
  pyramidMatchPlayed: (payload: { playerId: string; card: WireCard; distribution: Record<string, number> }) => void;
  busRiderSelected: (payload: { riderId: string; deckRemaining: number }) => void;
  busQuestionResolved: (
    payload: {
      riderId: string;
      question: RoundType;
      card: WireCard;
      correct: boolean;
      exitedBus: boolean;
      deckRemaining: number;
    },
  ) => void;
  gameFinished: (payload: { riderId: string }) => void;
  errorOccurred: (payload: { message: string }) => void;
}

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

export interface RoomBroadcastState {
  readonly code: string;
  readonly phase: string;
  readonly players: ReadonlyArray<{ id: string; name: string; ready: boolean; connected: boolean }>;
  readonly activePlayerId?: string;
  readonly penaltyLabel: string;
  readonly gameSettings: GameSettings;
}
