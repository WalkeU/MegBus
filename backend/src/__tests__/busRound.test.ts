import { answerBusQuestion, currentBusQuestionType, startBusAttempt } from '../game/busRound';
import { RoundType } from '../game/roundTypes';
import { FixedCardSource, card } from './testUtils';

const DEFAULT_ROUND_TYPES: readonly RoundType[] = ['redBlack', 'biggerSmaller', 'betweenOutside', 'suit'];

describe('startBusAttempt', () => {
  it('üres, 0. kérdésnél induló állapotot ad', () => {
    const attempt = startBusAttempt();
    expect(attempt.questionIndex).toBe(0);
    expect(attempt.cards).toEqual([]);
    expect(currentBusQuestionType(DEFAULT_ROUND_TYPES, attempt)).toBe('redBlack');
  });
});

describe('answerBusQuestion — sikeres végigjátszás', () => {
  it('mind a négy kérdés helyes válasza esetén kiszáll a buszból', () => {
    const deck = new FixedCardSource([
      card(5, 'hearts'), // piros/fekete: piros
      card(9, 'spades'), // nagyobb/kisebb az 5-höz képest: nagyobb
      card(7, 'spades'), // közte/kívül (5 és 9 közt): közte
      card(7, 'clubs'), // milyen szín: treff
    ]);
    let attempt = startBusAttempt();

    const r1 = answerBusQuestion(deck, attempt, 'red', DEFAULT_ROUND_TYPES);
    expect(r1.correct).toBe(true);
    expect(r1.exitedBus).toBe(false);
    attempt = r1.nextAttempt;
    expect(currentBusQuestionType(DEFAULT_ROUND_TYPES, attempt)).toBe('biggerSmaller');

    const r2 = answerBusQuestion(deck, attempt, 'bigger', DEFAULT_ROUND_TYPES);
    expect(r2.correct).toBe(true);
    attempt = r2.nextAttempt;
    expect(currentBusQuestionType(DEFAULT_ROUND_TYPES, attempt)).toBe('betweenOutside');

    const r3 = answerBusQuestion(deck, attempt, 'between', DEFAULT_ROUND_TYPES);
    expect(r3.correct).toBe(true);
    attempt = r3.nextAttempt;
    expect(currentBusQuestionType(DEFAULT_ROUND_TYPES, attempt)).toBe('suit');

    const r4 = answerBusQuestion(deck, attempt, 'clubs', DEFAULT_ROUND_TYPES);
    expect(r4.correct).toBe(true);
    expect(r4.exitedBus).toBe(true);
  });
});

describe('answerBusQuestion — hibás tipp visszaállítja a sort', () => {
  it('rossz tipp esetén a próbálkozás nullázódik, a kérdés újra az 1. (piros/fekete)', () => {
    const deck = new FixedCardSource([card(5, 'hearts'), card(9, 'spades')]);
    const attempt = startBusAttempt();

    const r1 = answerBusQuestion(deck, attempt, 'black', DEFAULT_ROUND_TYPES);
    expect(r1.correct).toBe(false);
    expect(r1.exitedBus).toBe(false);
    expect(r1.nextAttempt.questionIndex).toBe(0);
    expect(r1.nextAttempt.cards).toEqual([]);
    expect(currentBusQuestionType(DEFAULT_ROUND_TYPES, r1.nextAttempt)).toBe('redBlack');
  });

  it('a 2. kérdésnél (nagyobb/kisebb) hibázva is az elejére kerül vissza', () => {
    const deck = new FixedCardSource([card(5, 'hearts'), card(2, 'spades')]);
    let attempt = startBusAttempt();
    const r1 = answerBusQuestion(deck, attempt, 'red', DEFAULT_ROUND_TYPES);
    attempt = r1.nextAttempt;

    const r2 = answerBusQuestion(deck, attempt, 'bigger', DEFAULT_ROUND_TYPES);
    expect(r2.correct).toBe(false);
    expect(r2.nextAttempt.questionIndex).toBe(0);
    expect(r2.nextAttempt.cards).toEqual([]);
  });
});

describe('answerBusQuestion — testre szabott kör-lista', () => {
  it('a buszozás a konfigurált kör-típus-sorrendet futja, nem a régi fix négyet', () => {
    const roundTypes: readonly RoundType[] = ['suit', 'redBlack', 'exactRank'];
    const deck = new FixedCardSource([card(9, 'clubs'), card(5, 'hearts'), card(11, 'diamonds')]);
    let attempt = startBusAttempt();
    expect(currentBusQuestionType(roundTypes, attempt)).toBe('suit');

    const r1 = answerBusQuestion(deck, attempt, 'clubs', roundTypes);
    expect(r1.correct).toBe(true);
    attempt = r1.nextAttempt;
    expect(currentBusQuestionType(roundTypes, attempt)).toBe('redBlack');

    const r2 = answerBusQuestion(deck, attempt, 'red', roundTypes);
    expect(r2.correct).toBe(true);
    attempt = r2.nextAttempt;
    expect(currentBusQuestionType(roundTypes, attempt)).toBe('exactRank');

    const r3 = answerBusQuestion(deck, attempt, 11, roundTypes);
    expect(r3.correct).toBe(true);
    expect(r3.exitedBus).toBe(true);
  });
});
