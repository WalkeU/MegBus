import { Card } from './types';
import { CardSource, Deck, RandomSource } from './deck';
import { RoundGuess, drawCardForType, evaluateForType } from './roundLogic';
import { buildPyramid, findMatchingCards, PyramidSlot, PYRAMID_SIZE } from './pyramid';
import { validateDistribution } from './distribution';
import { answerBusQuestion, BusAttempt, startBusAttempt } from './busRound';
import { DEFAULT_GAME_SETTINGS, GameSettings, RoundDefinition } from './roundTypes';

export type { RoundGuess } from './roundLogic';

export const MIN_PLAYERS = 2;
/** A pakli (52 lap) 15 lapot tartalék a piramisnak; ennyi játékos fér el úgy,
 * hogy mindenkinek jusson egy lap az 1-N. kör mindegyikéhez a piramis kiosztása előtt. */
export const MAX_PLAYERS = Math.floor((52 - PYRAMID_SIZE) / 4);

/** `roundN` — N a szoba `GameSettings.rounds` listájának 1-alapú indexe, tehát a
 * körök száma (és sorrendje) tetszőleges lehet, nem csak a régi fix 1-4. */
export type GamePhase = 'lobby' | `round${number}` | 'pyramid' | 'bus' | 'finished';

export interface EnginePlayer {
  readonly id: string;
  readonly name: string;
  hand: Card[];
}

export class GameEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameEngineError';
  }
}

export interface RoundResult {
  readonly playerId: string;
  readonly phase: GamePhase;
  readonly card: Card;
  readonly correct: boolean;
  /** Rossz tipp esetén a kör konfigurált büntetése; jó tippnél 0. */
  readonly penaltyUnits: number;
  readonly roundAdvanced: boolean;
}

export interface PyramidFlipResult {
  readonly slot: PyramidSlot;
  readonly pyramidFinished: boolean;
}

export interface PyramidPlayResult {
  readonly playerId: string;
  readonly card: Card;
  readonly distribution: Record<string, number>;
}

export interface BusRiderDecision {
  readonly riderId: string;
  readonly handSizes: Record<string, number>;
}

function roundIndexForPhase(phase: GamePhase): number {
  const match = /^round(\d+)$/.exec(phase);
  if (!match) {
    throw new GameEngineError(`Nem kör-fázis: ${phase}`);
  }
  return Number(match[1]) - 1;
}

/** Egy adott fázishoz tartozó kör-definíciót adja vissza a szoba beállításaiból. */
export function roundDefinitionForPhase(phase: GamePhase, gameSettings: GameSettings): RoundDefinition {
  const index = roundIndexForPhase(phase);
  const definition = gameSettings.rounds[index];
  if (!definition) {
    throw new GameEngineError(`Nincs kör-definíció a(z) ${phase} fázishoz.`);
  }
  return definition;
}

/** Rossz tipp esetén a kör konfigurált büntetése (a `GameSettings.rounds`-ból). */
export function roundPenaltyUnits(phase: GamePhase, gameSettings: GameSettings): number {
  return roundDefinitionForPhase(phase, gameSettings).penaltyUnits;
}

/**
 * Egy szoba egy lezajló játékmenetét vezérlő, tisztán szerver oldali állapotgép.
 * Nincs hálózati / perzisztencia függősége — ez teszi unit tesztelhetővé.
 */
export class GameEngine {
  readonly players: EnginePlayer[];
  readonly gameSettings: GameSettings;
  phase: GamePhase = 'lobby';
  activePlayerIndex = 0;

  private deck: CardSource & { remaining: number };
  private pyramidSlots: PyramidSlot[] = [];
  private pyramidRevealIndex = -1;
  private busDeck: (CardSource & { remaining: number }) | null = null;
  private busRiderId: string | null = null;
  private busAttempt: BusAttempt = startBusAttempt();
  /** Rossz tipp után ennek a játékosnak kell nyugtáznia a büntetést, mielőtt bárki továbbléphet. */
  private pendingPenaltyPlayerId: string | null = null;

  constructor(
    players: readonly { id: string; name: string }[],
    random: RandomSource = Math.random,
    deckSource?: CardSource & { remaining: number },
    gameSettings: GameSettings = DEFAULT_GAME_SETTINGS,
  ) {
    if (players.length < MIN_PLAYERS) {
      throw new GameEngineError(`Legalább ${MIN_PLAYERS} játékos szükséges.`);
    }
    if (players.length > MAX_PLAYERS) {
      throw new GameEngineError(`Legfeljebb ${MAX_PLAYERS} játékos férhet egy szobába.`);
    }
    this.players = players.map((p) => ({ id: p.id, name: p.name, hand: [] }));
    this.deck = deckSource ?? new Deck(random);
    this.gameSettings = gameSettings;
  }

  start(): void {
    if (this.phase !== 'lobby') {
      throw new GameEngineError('A játék már elindult.');
    }
    this.phase = 'round1';
    this.activePlayerIndex = 0;
  }

  get activePlayer(): EnginePlayer {
    const player = this.players[this.activePlayerIndex];
    if (!player) throw new GameEngineError('Nincs aktív játékos.');
    return player;
  }

  private getPlayer(playerId: string): EnginePlayer {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) throw new GameEngineError(`Ismeretlen játékos: ${playerId}`);
    return player;
  }

  /** Az 1-N. kör tippjeit kezeli: lehúz egy lapot az aktív játékosnak, kiértékeli.
   * Jó tipp esetén azonnal léptet; rossz tipp esetén a kör csak akkor lép tovább,
   * ha a játékos nyugtázta a büntetést (lásd acknowledgeRoundPenalty). */
  submitGuess(playerId: string, guess: RoundGuess): RoundResult {
    if (this.phase === 'lobby' || this.phase === 'pyramid' || this.phase === 'bus' || this.phase === 'finished') {
      throw new GameEngineError(`Tipp csak kör-fázisban adható, jelenlegi fázis: ${this.phase}`);
    }
    if (this.pendingPenaltyPlayerId) {
      throw new GameEngineError('Előbb nyugtázni kell az előző büntetést, mielőtt új tipp adható.');
    }
    if (playerId !== this.activePlayer.id) {
      throw new GameEngineError('Most nem ennek a játékosnak van soron a tippelése.');
    }

    const player = this.getPlayer(playerId);
    const phase = this.phase;
    const roundDef = roundDefinitionForPhase(phase, this.gameSettings);
    const card = drawCardForType(this.deck, roundDef.type, player.hand);
    const correct = evaluateForType(roundDef.type, player.hand, card, guess);
    player.hand.push(card);

    const penaltyUnits = correct ? 0 : roundDef.penaltyUnits;
    let roundAdvanced = false;
    if (correct) {
      roundAdvanced = this.advanceTurn();
    } else {
      this.pendingPenaltyPlayerId = playerId;
    }

    return { playerId, phase, card, correct, penaltyUnits, roundAdvanced };
  }

  /** A hibás tippért járó büntetés nyugtázása — ez engedi tovább a kört a következő játékosra/körre. */
  acknowledgeRoundPenalty(playerId: string): { roundAdvanced: boolean } {
    if (this.pendingPenaltyPlayerId !== playerId) {
      throw new GameEngineError('Nincs nyugtázandó büntetésed.');
    }
    this.pendingPenaltyPlayerId = null;
    const roundAdvanced = this.advanceTurn();
    return { roundAdvanced };
  }

  /** Visszaadja, hogy a kör (és ezzel a fázis) váltott-e, miután mindenki tippelt. */
  private advanceTurn(): boolean {
    if (this.activePlayerIndex < this.players.length - 1) {
      this.activePlayerIndex++;
      return false;
    }
    this.activePlayerIndex = 0;
    const currentRoundIndex = roundIndexForPhase(this.phase);
    const nextRoundIndex = currentRoundIndex + 1;
    if (nextRoundIndex < this.gameSettings.rounds.length) {
      this.phase = `round${nextRoundIndex + 1}`;
    } else {
      this.phase = 'pyramid';
      this.pyramidSlots = buildPyramid(this.deck);
      this.pyramidRevealIndex = -1;
    }
    return true;
  }

  /** Felfordítja a piramis következő lapját (a hívó felelőssége az időzítés, pl. 5 mp-enként). */
  flipNextPyramidCard(): PyramidFlipResult {
    if (this.phase !== 'pyramid') {
      throw new GameEngineError(`Piramis-lapot csak piramis fázisban lehet fordítani, jelenlegi: ${this.phase}`);
    }
    if (this.pyramidRevealIndex >= PYRAMID_SIZE - 1) {
      throw new GameEngineError('A piramis összes lapja már fel van fordítva.');
    }
    this.pyramidRevealIndex++;
    const slot = this.pyramidSlots[this.pyramidRevealIndex];
    if (!slot) throw new GameEngineError('Hiányzó piramis-lap.');
    const pyramidFinished = this.pyramidRevealIndex === PYRAMID_SIZE - 1;
    return { slot, pyramidFinished };
  }

  /**
   * Egy játékos lerakja az egyező értékű lapját a kezéből, és kiosztja a sor büntetését.
   * A `distribution` a kliens saját döntése (kinek hány büntetés-egységet ad) — nem
   * kötelező egyenlő elosztás —, csak azt ellenőrizzük, hogy pontosan a sor
   * (host által beállított) büntetés-mennyiségét osztja ki.
   */
  playPyramidMatch(
    playerId: string,
    card: Card,
    distribution: Readonly<Record<string, number>>,
  ): PyramidPlayResult {
    if (this.phase !== 'pyramid') {
      throw new GameEngineError('Piramis-lapot csak piramis fázisban lehet lerakni.');
    }
    const currentSlot = this.pyramidSlots[this.pyramidRevealIndex];
    if (!currentSlot) {
      throw new GameEngineError('Még nincs felfordított piramis-lap.');
    }
    const player = this.getPlayer(playerId);
    const matches = findMatchingCards(currentSlot.card, player.hand);
    const handIndex = player.hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
    if (handIndex === -1 || !matches.some((m) => m.suit === card.suit && m.rank === card.rank)) {
      throw new GameEngineError('A megadott lap nem egyezik a felfordult piramis-lap értékével, vagy nincs a kezében.');
    }
    for (const recipientId of Object.keys(distribution)) {
      if (recipientId === playerId) {
        throw new GameEngineError('Saját magadnak nem oszthatod ki a büntetést.');
      }
      this.getPlayer(recipientId);
    }
    // rowValue mindig 1-5, a pyramidRowPenalties pedig `validateGameSettings` által
    // garantáltan pontosan 5 elemű — TS csak nem tudja ezt statikusan levezetni indexelésnél.
    const rowPenalty = this.gameSettings.pyramidRowPenalties[currentSlot.rowValue - 1] as number;
    try {
      validateDistribution(rowPenalty, distribution);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Érvénytelen kiosztás.';
      throw new GameEngineError(message);
    }

    player.hand.splice(handIndex, 1);
    return { playerId, card, distribution: { ...distribution } };
  }

  /** Eldönti, ki buszozik: akinek a legtöbb lap maradt a kezében; döntetlennél újabb húzás dönt. */
  determineBusRider(): BusRiderDecision {
    if (this.pyramidRevealIndex !== PYRAMID_SIZE - 1) {
      throw new GameEngineError('A buszozó csak a piramis lezárása után dől el.');
    }
    const handSizes: Record<string, number> = {};
    this.players.forEach((p) => {
      handSizes[p.id] = p.hand.length;
    });
    const maxSize = Math.max(...Object.values(handSizes));
    let tied = this.players.filter((p) => handSizes[p.id] === maxSize);

    while (tied.length > 1) {
      const draws = tied.map((p) => ({ player: p, card: this.deck.remaining > 0 ? this.deck.draw() : null }));
      const withCards = draws.filter((d): d is { player: EnginePlayer; card: Card } => d.card !== null);
      if (withCards.length === 0) break;
      const bestRank = Math.max(...withCards.map((d) => d.card.rank));
      tied = withCards.filter((d) => d.card.rank === bestRank).map((d) => d.player);
    }

    const rider = tied[0] ?? this.players[0];
    if (!rider) throw new GameEngineError('Nincs játékos a buszozó kiválasztásához.');
    this.busRiderId = rider.id;
    return { riderId: rider.id, handSizes };
  }

  /** Lezárja a piramis kört, és elindítja a buszozást egy friss paklival. */
  startBusRound(random: RandomSource = Math.random, busDeckSource?: CardSource & { remaining: number }): string {
    if (!this.busRiderId) {
      this.determineBusRider();
    }
    this.phase = 'bus';
    this.busDeck = busDeckSource ?? new Deck(random);
    this.busAttempt = startBusAttempt();
    return this.busRiderId as string;
  }

  get busRider(): string | null {
    return this.busRiderId;
  }

  get currentBusAttempt(): BusAttempt {
    return this.busAttempt;
  }

  /** A buszozáshoz használt pakli hátralévő lapjainak száma. */
  get busDeckRemaining(): number {
    return this.busDeck?.remaining ?? 0;
  }

  /** A buszozás mindig ugyanazt a kör-típus-sorrendet futja végig, mint az 1-N. kör. */
  answerBus(playerId: string, guess: RoundGuess) {
    if (this.phase !== 'bus') {
      throw new GameEngineError('Buszozás csak a bus fázisban zajlik.');
    }
    if (playerId !== this.busRiderId) {
      throw new GameEngineError('Csak a buszozó játékos válaszolhat.');
    }
    if (!this.busDeck) {
      throw new GameEngineError('Nincs inicializálva a buszozás paklija.');
    }
    const roundTypes = this.gameSettings.rounds.map((r) => r.type);
    const result = answerBusQuestion(this.busDeck, this.busAttempt, guess, roundTypes);
    this.busAttempt = result.nextAttempt;
    if (result.exitedBus) {
      this.phase = 'finished';
    }
    return result;
  }
}
