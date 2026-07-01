import { answerBusQuestion, BUS_QUESTIONS, currentBusQuestion, startBusAttempt } from '../game/busRound';
import { FixedCardSource, card } from './testUtils';

describe('startBusAttempt', () => {
  it('üres, 0. kérdésnél induló állapotot ad', () => {
    const attempt = startBusAttempt();
    expect(attempt.questionIndex).toBe(0);
    expect(attempt.cards).toEqual([]);
    expect(currentBusQuestion(attempt)).toBe('redBlack');
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

    const r1 = answerBusQuestion(deck, attempt, 'red');
    expect(r1.correct).toBe(true);
    expect(r1.exitedBus).toBe(false);
    attempt = r1.nextAttempt;
    expect(currentBusQuestion(attempt)).toBe('biggerSmaller');

    const r2 = answerBusQuestion(deck, attempt, 'bigger');
    expect(r2.correct).toBe(true);
    attempt = r2.nextAttempt;
    expect(currentBusQuestion(attempt)).toBe('betweenOutside');

    const r3 = answerBusQuestion(deck, attempt, 'between');
    expect(r3.correct).toBe(true);
    attempt = r3.nextAttempt;
    expect(currentBusQuestion(attempt)).toBe('suit');

    const r4 = answerBusQuestion(deck, attempt, 'clubs');
    expect(r4.correct).toBe(true);
    expect(r4.exitedBus).toBe(true);
  });
});

describe('answerBusQuestion — hibás tipp visszaállítja a sort', () => {
  it('rossz tipp esetén a próbálkozás nullázódik, a kérdés újra az 1. (piros/fekete)', () => {
    const deck = new FixedCardSource([card(5, 'hearts'), card(9, 'spades')]);
    const attempt = startBusAttempt();

    const r1 = answerBusQuestion(deck, attempt, 'black');
    expect(r1.correct).toBe(false);
    expect(r1.exitedBus).toBe(false);
    expect(r1.nextAttempt.questionIndex).toBe(0);
    expect(r1.nextAttempt.cards).toEqual([]);
    expect(currentBusQuestion(r1.nextAttempt)).toBe('redBlack');
  });

  it('a 2. kérdésnél (nagyobb/kisebb) hibázva is az elejére kerül vissza', () => {
    const deck = new FixedCardSource([card(5, 'hearts'), card(2, 'spades')]);
    let attempt = startBusAttempt();
    const r1 = answerBusQuestion(deck, attempt, 'red');
    attempt = r1.nextAttempt;

    const r2 = answerBusQuestion(deck, attempt, 'bigger');
    expect(r2.correct).toBe(false);
    expect(r2.nextAttempt.questionIndex).toBe(0);
    expect(r2.nextAttempt.cards).toEqual([]);
  });
});

describe('a négy kérdés sorrendje', () => {
  it('redBlack, biggerSmaller, betweenOutside, suit', () => {
    expect(BUS_QUESTIONS).toEqual(['redBlack', 'biggerSmaller', 'betweenOutside', 'suit']);
  });
});
