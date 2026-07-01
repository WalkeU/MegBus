import { Card, Suit, SuitColor } from './types';
import { CardSource } from './deck';
import {
  BetweenOutsideGuess,
  BiggerSmallerGuess,
  evaluateBetweenOutside,
  evaluateBiggerSmaller,
  evaluateRedBlack,
  evaluateSuitGuess,
} from './rounds';

export const BUS_QUESTIONS = ['redBlack', 'biggerSmaller', 'betweenOutside', 'suit'] as const;
export type BusQuestion = (typeof BUS_QUESTIONS)[number];

export type BusGuess = SuitColor | BiggerSmallerGuess | BetweenOutsideGuess | Suit;

export interface BusAttempt {
  /** A következő megválaszolandó kérdés indexe (0-3). */
  readonly questionIndex: number;
  /** Az aktuális próbálkozásban eddig felfordult lapok, sorrendben. */
  readonly cards: readonly Card[];
}

export function startBusAttempt(): BusAttempt {
  return { questionIndex: 0, cards: [] };
}

export interface BusAnswerResult {
  readonly question: BusQuestion;
  readonly card: Card;
  readonly correct: boolean;
  /** Hibás tipp esetén az elejéről induló új próbálkozás, jó tipp esetén a bővített állapot. */
  readonly nextAttempt: BusAttempt;
  /** Igaz, ha a játékos mind a négy kérdést hibátlanul megválaszolta, és kiszáll a buszból. */
  readonly exitedBus: boolean;
}

export class InvalidBusStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBusStateError';
  }
}

export function currentBusQuestion(attempt: BusAttempt): BusQuestion {
  const question = BUS_QUESTIONS[attempt.questionIndex];
  if (!question) {
    throw new InvalidBusStateError('A próbálkozás már a négy kérdés mindegyikére válaszolt.');
  }
  return question;
}

/**
 * Lehúzza a következő lapot (a 2-3. kérdésnél kizárva az aznapi próbálkozás
 * korábbi lapjainak értékét), kiértékeli a tippet, és visszaadja az új állapotot.
 * Hibás tipp esetén a próbálkozás nullázódik, és elölről kell kezdeni a sort.
 */
export function answerBusQuestion(
  deck: CardSource,
  attempt: BusAttempt,
  guess: BusGuess,
): BusAnswerResult {
  const question = currentBusQuestion(attempt);
  const card = drawCardForQuestion(deck, question, attempt.cards);
  const correct = evaluateGuessForQuestion(question, attempt.cards, card, guess);

  if (!correct) {
    return { question, card, correct: false, nextAttempt: startBusAttempt(), exitedBus: false };
  }

  const cards = [...attempt.cards, card];
  const questionIndex = attempt.questionIndex + 1;
  const exitedBus = questionIndex >= BUS_QUESTIONS.length;
  return {
    question,
    card,
    correct: true,
    nextAttempt: { questionIndex, cards },
    exitedBus,
  };
}

function drawCardForQuestion(
  deck: CardSource,
  question: BusQuestion,
  previousCards: readonly Card[],
): Card {
  if (question === 'biggerSmaller') {
    const reference = previousCards[0];
    if (!reference) throw new InvalidBusStateError('Hiányzik az első lap a nagyobb/kisebb kérdéshez.');
    return deck.drawExcludingRanks(new Set([reference.rank]));
  }
  if (question === 'betweenOutside') {
    const first = previousCards[0];
    const second = previousCards[1];
    if (!first || !second) {
      throw new InvalidBusStateError('Hiányzik az első két lap a közte/kívül kérdéshez.');
    }
    return deck.drawExcludingRanks(new Set([first.rank, second.rank]));
  }
  return deck.draw();
}

function evaluateGuessForQuestion(
  question: BusQuestion,
  previousCards: readonly Card[],
  card: Card,
  guess: BusGuess,
): boolean {
  switch (question) {
    case 'redBlack':
      return evaluateRedBlack(card, guess as SuitColor);
    case 'biggerSmaller': {
      const reference = previousCards[0] as Card;
      return evaluateBiggerSmaller(reference, card, guess as BiggerSmallerGuess);
    }
    case 'betweenOutside': {
      const first = previousCards[0] as Card;
      const second = previousCards[1] as Card;
      return evaluateBetweenOutside(first, second, card, guess as BetweenOutsideGuess);
    }
    case 'suit':
      return evaluateSuitGuess(card, guess as Suit);
  }
}
