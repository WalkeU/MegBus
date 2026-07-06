import { Card } from './types';
import { CardSource } from './deck';
import { RoundGuess, drawCardForType, evaluateForType } from './roundLogic';
import { RoundType } from './roundTypes';

export type BusGuess = RoundGuess;

export interface BusAttempt {
  /** A következő megválaszolandó kérdés indexe a kör-lista szerint. */
  readonly questionIndex: number;
  /** Az aktuális próbálkozásban eddig felfordult lapok, sorrendben. */
  readonly cards: readonly Card[];
}

export function startBusAttempt(): BusAttempt {
  return { questionIndex: 0, cards: [] };
}

export interface BusAnswerResult {
  readonly question: RoundType;
  readonly card: Card;
  readonly correct: boolean;
  /** Hibás tipp esetén az elejéről induló új próbálkozás, jó tipp esetén a bővített állapot. */
  readonly nextAttempt: BusAttempt;
  /** Igaz, ha a játékos a teljes (konfigurált) kör-sort hibátlanul megválaszolta, és kiszáll a buszból. */
  readonly exitedBus: boolean;
}

export class InvalidBusStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBusStateError';
  }
}

export function currentBusQuestionType(roundTypes: readonly RoundType[], attempt: BusAttempt): RoundType {
  const type = roundTypes[attempt.questionIndex];
  if (!type) {
    throw new InvalidBusStateError('A próbálkozás már a kör-lista mindegyik kérdésére válaszolt.');
  }
  return type;
}

/**
 * Lehúzza a következő lapot, kiértékeli a tippet, és visszaadja az új állapotot.
 * Hibás tipp esetén a próbálkozás nullázódik, és elölről kell kezdeni a sort.
 * A `roundTypes` a szoba `GameSettings.rounds`-jából jön — a buszozás mindig
 * ugyanazt a kör-típus-sorrendet futja végig, mint az 1-N. kör.
 */
export function answerBusQuestion(
  deck: CardSource,
  attempt: BusAttempt,
  guess: BusGuess,
  roundTypes: readonly RoundType[],
): BusAnswerResult {
  const questionType = currentBusQuestionType(roundTypes, attempt);
  const card = drawCardForType(deck, questionType, attempt.cards);
  const correct = evaluateForType(questionType, attempt.cards, card, guess);

  if (!correct) {
    return { question: questionType, card, correct: false, nextAttempt: startBusAttempt(), exitedBus: false };
  }

  const cards = [...attempt.cards, card];
  const questionIndex = attempt.questionIndex + 1;
  const exitedBus = questionIndex >= roundTypes.length;
  return {
    question: questionType,
    card,
    correct: true,
    nextAttempt: { questionIndex, cards },
    exitedBus,
  };
}
