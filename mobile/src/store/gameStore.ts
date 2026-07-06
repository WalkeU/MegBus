import { create } from 'zustand';
import { connectSocket, disconnectSocket, registerListeners, rpc } from '../services/socket';
import { cardsEqual, DEFAULT_GAME_SETTINGS, DEFAULT_PENALTY_LABEL } from '../types/game';
import type {
  BusGuess,
  Card,
  GamePhase,
  GameSettings,
  RoomBroadcastState,
  RoomState,
  RoundGuess,
  RoundType,
} from '../types/game';

export type Screen = 'home' | 'lobby' | 'round' | 'pyramid' | 'bus' | 'gameOver';

export interface PyramidFlipDisplay {
  readonly revealIndex: number;
  readonly rowValue: number;
  readonly card: Card;
}

export interface BusResultDisplay {
  readonly question: RoundType;
  readonly card: Card;
  readonly correct: boolean;
}

interface GameState {
  screen: Screen;
  roomState: RoomState | null;
  myPlayerId: string | null;
  myHand: Card[];
  lastDrawnCard: Card | null;
  lastGuessCorrect: boolean | null;
  pendingPenaltyUnits: number | null;
  pendingPyramidDrinkUnits: number | null;
  pyramidFlips: PyramidFlipDisplay[];
  isDecidingPyramidMatch: boolean;
  busRiderId: string | null;
  busAttemptCards: Card[];
  busLastResult: BusResultDisplay | null;
  busDeckRemaining: number | null;
  winnerOfBusId: string | null;
  errorMessage: string | null;
  isBusy: boolean;
}

interface GameActions {
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (code: string, playerName: string) => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  setPenaltyLabel: (label: string) => Promise<void>;
  setGameSettings: (settings: GameSettings) => Promise<void>;
  submitGuess: (guess: RoundGuess) => Promise<void>;
  acknowledgePenalty: () => Promise<void>;
  beginPyramidMatch: () => Promise<void>;
  cancelPyramidMatch: () => Promise<void>;
  playPyramidMatch: (card: Card, distribution: Record<string, number>) => Promise<void>;
  acknowledgePyramidDrink: () => Promise<void>;
  answerBus: (guess: BusGuess) => Promise<void>;
  requestNewRound: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  clearError: () => void;
}

export type GameStore = GameState & GameActions;

const initialTransientState: Pick<
  GameState,
  | 'myHand'
  | 'lastDrawnCard'
  | 'lastGuessCorrect'
  | 'pendingPenaltyUnits'
  | 'pendingPyramidDrinkUnits'
  | 'pyramidFlips'
  | 'isDecidingPyramidMatch'
  | 'busRiderId'
  | 'busAttemptCards'
  | 'busLastResult'
  | 'busDeckRemaining'
  | 'winnerOfBusId'
> = {
  myHand: [],
  lastDrawnCard: null,
  lastGuessCorrect: null,
  pendingPenaltyUnits: null,
  pendingPyramidDrinkUnits: null,
  pyramidFlips: [],
  isDecidingPyramidMatch: false,
  busRiderId: null,
  busAttemptCards: [],
  busLastResult: null,
  busDeckRemaining: null,
  winnerOfBusId: null,
};

function screenForPhase(phase: GamePhase): Screen {
  if (phase === 'lobby') return 'lobby';
  if (phase === 'pyramid') return 'pyramid';
  if (phase === 'bus') return 'bus';
  if (phase === 'finished') return 'gameOver';
  return 'round'; // `round${N}` — tetszőleges számú/sorrendű kör lehet
}

function toRoomState(state: RoomBroadcastState): RoomState {
  return {
    code: state.code,
    phase: state.phase as GamePhase,
    players: state.players.map((p) => ({ ...p })),
    activePlayerId: state.activePlayerId,
    penaltyLabel: state.penaltyLabel,
    gameSettings: state.gameSettings,
  };
}

let listenersUnsubscribe: (() => void) | null = null;

export const useGameStore = create<GameStore>((set, get) => {
  function ensureListeners() {
    if (listenersUnsubscribe) return;
    listenersUnsubscribe = registerListeners({
      onRoomUpdated: (broadcast) => {
        const roomState = toRoomState(broadcast);
        set({ roomState, screen: screenForPhase(roomState.phase) });
      },
      onActivePlayerChanged: ({ playerId, phase }) => {
        set((s) => ({
          roomState: s.roomState
            ? { ...s.roomState, activePlayerId: playerId, phase: phase as GamePhase }
            : s.roomState,
          screen: screenForPhase(phase as GamePhase),
          lastDrawnCard: null,
          lastGuessCorrect: null,
        }));
      },
      onGuessResolved: ({ playerId, card, correct, penaltyUnits }) => {
        const { myPlayerId } = get();
        if (playerId !== myPlayerId) return;
        set((s) => ({
          myHand: [...s.myHand, card],
          lastDrawnCard: card,
          lastGuessCorrect: correct,
          pendingPenaltyUnits: correct ? null : penaltyUnits,
        }));
      },
      onPyramidCardFlipped: ({ revealIndex, rowValue, card, pyramidFinished }) => {
        set((s) => ({
          pyramidFlips: [...s.pyramidFlips, { revealIndex, rowValue, card }],
          screen: pyramidFinished ? 'pyramid' : s.screen,
        }));
      },
      onPyramidMatchPlayed: ({ playerId, card, distribution }) => {
        const { myPlayerId } = get();
        set((s) => {
          const myHand =
            playerId === myPlayerId
              ? s.myHand.filter((c) => !cardsEqual(c, card))
              : s.myHand;
          const myUnits = myPlayerId ? distribution[myPlayerId] : undefined;
          const pendingPyramidDrinkUnits = myUnits
            ? (s.pendingPyramidDrinkUnits ?? 0) + myUnits
            : s.pendingPyramidDrinkUnits;
          return { myHand, pendingPyramidDrinkUnits };
        });
      },
      onBusRiderSelected: ({ riderId, deckRemaining }) => {
        set({
          busRiderId: riderId,
          busAttemptCards: [],
          busLastResult: null,
          busDeckRemaining: deckRemaining,
          screen: 'bus',
        });
      },
      onBusQuestionResolved: ({ question, card, correct, deckRemaining }) => {
        set((s) => ({
          busLastResult: { question, card, correct },
          busDeckRemaining: deckRemaining,
          busAttemptCards: correct ? [...s.busAttemptCards, card] : [],
        }));
      },
      onGameFinished: ({ riderId }) => {
        set({ winnerOfBusId: riderId, screen: 'gameOver' });
      },
      onErrorOccurred: ({ message }) => {
        set({ errorMessage: message });
      },
    });
  }

  async function run(operation: () => Promise<void>): Promise<void> {
    set({ isBusy: true });
    try {
      await operation();
    } catch (error) {
      set({ errorMessage: error instanceof Error ? error.message : 'Ismeretlen hiba.' });
    } finally {
      set({ isBusy: false });
    }
  }

  return {
    screen: 'home',
    roomState: null,
    myPlayerId: null,
    errorMessage: null,
    isBusy: false,
    ...initialTransientState,

    createRoom: (playerName) =>
      run(async () => {
        ensureListeners();
        await connectSocket();
        const { playerId } = await rpc.createRoom(playerName);
        set({ myPlayerId: playerId, screen: 'lobby' });
      }),

    joinRoom: (code, playerName) =>
      run(async () => {
        ensureListeners();
        await connectSocket();
        const playerId = await rpc.joinRoom(code, playerName);
        set({ myPlayerId: playerId, screen: 'lobby' });
      }),

    setReady: (ready) => run(() => rpc.setReady(ready)),

    setPenaltyLabel: (label) => run(() => rpc.setPenaltyLabel(label)),

    setGameSettings: (settings) => run(() => rpc.setGameSettings(settings)),

    submitGuess: (guess) => run(() => rpc.submitGuess(guess)),

    acknowledgePenalty: () =>
      run(async () => {
        await rpc.acknowledgePenalty();
        set({ pendingPenaltyUnits: null });
      }),

    beginPyramidMatch: () =>
      run(async () => {
        await rpc.beginPyramidMatch();
        set({ isDecidingPyramidMatch: true });
      }),

    cancelPyramidMatch: () =>
      run(async () => {
        await rpc.cancelPyramidMatch();
        set({ isDecidingPyramidMatch: false });
      }),

    playPyramidMatch: (card, distribution) =>
      run(async () => {
        await rpc.playPyramidMatch(card, distribution);
        set({ isDecidingPyramidMatch: false });
      }),

    acknowledgePyramidDrink: () =>
      run(async () => {
        await rpc.acknowledgePyramidDrink();
        set({ pendingPyramidDrinkUnits: null });
      }),

    answerBus: (guess) => run(() => rpc.answerBus(guess)),

    requestNewRound: () =>
      run(async () => {
        await rpc.requestNewRound();
        set({ ...initialTransientState });
      }),

    leaveRoom: () =>
      run(async () => {
        await rpc.leaveRoom();
        disconnectSocket();
        listenersUnsubscribe?.();
        listenersUnsubscribe = null;
        set({
          screen: 'home',
          roomState: null,
          myPlayerId: null,
          ...initialTransientState,
        });
      }),

    clearError: () => set({ errorMessage: null }),
  };
});

// ---- Derived selectors (mirror GameViewModel computed properties) ----

export function selectIsHost(state: GameStore): boolean {
  return state.roomState?.players[0]?.id === state.myPlayerId;
}

export function selectIsMyTurn(state: GameStore): boolean {
  return state.roomState?.activePlayerId === state.myPlayerId;
}

export function selectIsBusRider(state: GameStore): boolean {
  return state.busRiderId === state.myPlayerId;
}

export function selectGameSettings(state: GameStore): GameSettings {
  return state.roomState?.gameSettings ?? DEFAULT_GAME_SETTINGS;
}

/** Az aktuális kör TÍPUSA a `phase` ("roundN") stringből kinyert index alapján. */
export function selectCurrentRoundType(state: GameStore): RoundType | null {
  const phase = state.roomState?.phase;
  if (!phase || phase === 'lobby' || phase === 'pyramid' || phase === 'bus' || phase === 'finished') {
    return null;
  }
  const index = Number(phase.replace('round', '')) - 1;
  return selectGameSettings(state).rounds[index]?.type ?? null;
}

/** A buszozó eddig hibátlanul megválaszolt kérdéseinek száma adja az aktuális
 * kör-lista-indexet — hibás válasz esetén ez 0-ra esik vissza (lásd busAttemptCards). */
export function selectCurrentBusQuestion(state: GameStore): RoundType {
  const rounds = selectGameSettings(state).rounds;
  const index = state.busAttemptCards.length;
  return rounds[index]?.type ?? rounds[0].type;
}

export function selectActivePlayerName(state: GameStore): string | null {
  const id = state.roomState?.activePlayerId;
  if (!id) return null;
  return state.roomState?.players.find((p) => p.id === id)?.name ?? null;
}

export function selectPenaltyLabel(state: GameStore): string {
  return state.roomState?.penaltyLabel ?? DEFAULT_PENALTY_LABEL;
}
