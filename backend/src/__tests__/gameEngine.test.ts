import { GameEngine, GameEngineError, MAX_PLAYERS, MIN_PLAYERS, roundPenaltyUnits } from '../game/gameEngine';
import { PYRAMID_SIZE } from '../game/pyramid';
import { DEFAULT_GAME_SETTINGS, GameSettings } from '../game/roundTypes';
import { FixedCardSource, card } from './testUtils';

describe('GameEngine — konstruktor validáció', () => {
  it(`legalább ${MIN_PLAYERS} játékost követel meg`, () => {
    expect(() => new GameEngine([{ id: 'a', name: 'A' }])).toThrow(GameEngineError);
  });

  it(`legfeljebb ${MAX_PLAYERS} játékost enged be`, () => {
    const players = Array.from({ length: MAX_PLAYERS + 1 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    expect(() => new GameEngine(players)).toThrow(GameEngineError);
  });
});

function buildDeterministicEngine() {
  const queue = [
    card(5, 'hearts'), // A r1 — piros
    card(6, 'clubs'), // B r1 — fekete
    card(9, 'clubs'), // A r2 — nagyobb mint 5
    card(2, 'hearts'), // B r2 — kisebb mint 6
    card(7, 'spades'), // A r3 — 5 és 9 közt: közte
    card(10, 'diamonds'), // B r3 — 2 és 6 közt kívül: kívül
    card(4, 'diamonds'), // A r4 — szín: diamonds
    card(11, 'spades'), // B r4 — szín: spades
    card(9, 'diamonds'), // piramis slot0 (rowValue 1) — egyezik A r2 (9-es) lapjával
    ...Array.from({ length: 14 }, () => card(13, 'clubs')), // piramis töltőlapok
  ];
  const deck = new FixedCardSource(queue);
  const engine = new GameEngine([{ id: 'A', name: 'Anna' }, { id: 'B', name: 'Béla' }], Math.random, deck);
  engine.start();
  return engine;
}

describe('GameEngine — 1-4. kör menete', () => {
  it('a kör mindenkin végigmegy, majd automatikusan a következőre vált', () => {
    const engine = buildDeterministicEngine();
    expect(engine.phase).toBe('round1');
    expect(engine.activePlayer.id).toBe('A');

    expect(() => engine.submitGuess('B', 'red')).toThrow(GameEngineError); // nincs B-n a sor

    const r1a = engine.submitGuess('A', 'red');
    expect(r1a.correct).toBe(true);
    expect(r1a.roundAdvanced).toBe(false);
    expect(engine.phase).toBe('round1');
    expect(engine.activePlayer.id).toBe('B');

    const r1b = engine.submitGuess('B', 'black');
    expect(r1b.correct).toBe(true);
    expect(r1b.roundAdvanced).toBe(true);
    expect(engine.phase).toBe('round2');
    expect(engine.activePlayer.id).toBe('A');
  });

  it('végigmegy mind a 4 körön, és minden játékosnak 4 lapja lesz a kezében', () => {
    const engine = buildDeterministicEngine();

    engine.submitGuess('A', 'red');
    engine.submitGuess('B', 'black');
    engine.submitGuess('A', 'bigger');
    engine.submitGuess('B', 'smaller');
    engine.submitGuess('A', 'between');
    engine.submitGuess('B', 'outside');
    engine.submitGuess('A', 'diamonds');
    expect(engine.phase).toBe('round4');
    const last = engine.submitGuess('B', 'spades');

    expect(last.correct).toBe(true);
    expect(engine.phase).toBe('pyramid');
    expect(engine.players.find((p) => p.id === 'A')?.hand).toHaveLength(4);
    expect(engine.players.find((p) => p.id === 'B')?.hand).toHaveLength(4);
  });

  it('egyenlő rangú második lap soha nem fordulhat elő', () => {
    const engine = buildDeterministicEngine();
    engine.submitGuess('A', 'red'); // A r1 = rank 5
    engine.submitGuess('B', 'black');
    const r2 = engine.submitGuess('A', 'bigger'); // A r2-nek != 5-nek kell lennie
    expect(r2.card.rank).not.toBe(5);
  });
});

function playToRoundsEnd(engine: GameEngine) {
  engine.submitGuess('A', 'red');
  engine.submitGuess('B', 'black');
  engine.submitGuess('A', 'bigger');
  engine.submitGuess('B', 'smaller');
  engine.submitGuess('A', 'between');
  engine.submitGuess('B', 'outside');
  engine.submitGuess('A', 'diamonds');
  engine.submitGuess('B', 'spades');
}

describe('GameEngine — piramis', () => {
  it('flipNextPyramidCard sorban fordítja a 15 lapot, az utolsónál pyramidFinished=true', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);

    for (let i = 0; i < PYRAMID_SIZE; i++) {
      const result = engine.flipNextPyramidCard();
      expect(result.slot.revealIndex).toBe(i);
      expect(result.pyramidFinished).toBe(i === PYRAMID_SIZE - 1);
    }
    expect(() => engine.flipNextPyramidCard()).toThrow(GameEngineError);
  });

  it('playPyramidMatch lerakja az egyező lapot, és szétosztja a sor értékét', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);

    engine.flipNextPyramidCard(); // revealIndex 0, rowValue 1, card = 9 diamonds

    const result = engine.playPyramidMatch('A', { suit: 'clubs', rank: 9 }, { B: 1 });
    expect(result.distribution).toEqual({ B: 1 });
    expect(engine.players.find((p) => p.id === 'A')?.hand).toHaveLength(3);
  });

  it('hibát dob, ha a megadott lap nincs a játékos kezében', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);
    engine.flipNextPyramidCard();

    expect(() => engine.playPyramidMatch('A', { suit: 'hearts', rank: 9 }, { B: 1 })).toThrow(GameEngineError);
  });

  it('hibát dob, ha a kiosztott mennyiség nem egyezik a sor értékével', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);
    engine.flipNextPyramidCard(); // rowValue 1

    expect(() => engine.playPyramidMatch('A', { suit: 'clubs', rank: 9 }, { B: 2 })).toThrow(GameEngineError);
  });

  it('hibát dob, ha a játékos saját magának osztaná ki a büntetést', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);
    engine.flipNextPyramidCard();

    expect(() => engine.playPyramidMatch('A', { suit: 'clubs', rank: 9 }, { A: 1 })).toThrow(GameEngineError);
  });

  it('a 2. soron (rowValue=2) két különböző címzett közt is szétosztható a büntetés', () => {
    const queue = [
      card(9, 'hearts'), // A r1 — piros
      card(4, 'clubs'), // B r1 — fekete
      card(6, 'spades'), // C r1 — fekete
      card(11, 'hearts'), // A r2 — nagyobb mint 9
      card(2, 'clubs'), // B r2 — kisebb mint 4
      card(3, 'spades'), // C r2 — kisebb mint 6
      card(10, 'hearts'), // A r3 — 9 és 11 közt: közte
      card(7, 'clubs'), // B r3 — 2 és 4-en kívül: kívül
      card(13, 'spades'), // C r3 — 3 és 6-on kívül: kívül
      card(4, 'diamonds'), // A r4 — diamonds
      card(5, 'diamonds'), // B r4 — diamonds
      card(7, 'diamonds'), // C r4 — diamonds
      // piramis: index0-4 = 1. sor (töltőlapok), index5 = 2. sor első lapja (9-es, egyezik A r1 lapjával),
      // index9 = 3. sor első lapja (11-es, egyezik A r2 lapjával, aszimmetrikus kioszáshoz)
      ...Array.from({ length: 5 }, () => card(8, 'clubs')),
      card(9, 'spades'),
      ...Array.from({ length: 3 }, () => card(8, 'clubs')),
      card(11, 'clubs'),
      ...Array.from({ length: 5 }, () => card(8, 'clubs')),
    ];
    const deck = new FixedCardSource(queue);
    const engine = new GameEngine(
      [{ id: 'A', name: 'Anna' }, { id: 'B', name: 'Béla' }, { id: 'C', name: 'Cili' }],
      Math.random,
      deck,
    );
    engine.start();

    engine.submitGuess('A', 'red');
    engine.submitGuess('B', 'black');
    engine.submitGuess('C', 'black');
    engine.submitGuess('A', 'bigger');
    engine.submitGuess('B', 'smaller');
    engine.submitGuess('C', 'smaller');
    engine.submitGuess('A', 'between');
    engine.submitGuess('B', 'outside');
    engine.submitGuess('C', 'outside');
    engine.submitGuess('A', 'diamonds');
    engine.submitGuess('B', 'diamonds');
    engine.submitGuess('C', 'diamonds');

    for (let i = 0; i < 6; i++) engine.flipNextPyramidCard(); // revealIndex 5-ig (2. sor első lapja)

    const result = engine.playPyramidMatch('A', { suit: 'hearts', rank: 9 }, { B: 1, C: 1 });
    expect(result.distribution).toEqual({ B: 1, C: 1 });

    for (let i = 0; i < 4; i++) engine.flipNextPyramidCard(); // revealIndex 9-ig (3. sor első lapja)

    // Aszimmetrikus kiosztás: a 3 kortyból B kettőt, C egyet kap — a játékos szabadon dönt, nem kötelező egyenlő elosztás.
    const asymmetricResult = engine.playPyramidMatch('A', { suit: 'hearts', rank: 11 }, { B: 2, C: 1 });
    expect(asymmetricResult.distribution).toEqual({ B: 2, C: 1 });
  });
});

describe('roundPenaltyUnits', () => {
  it('a kör sorszámával egyező büntetést ad vissza (alapértelmezett 1-4. kör)', () => {
    expect(roundPenaltyUnits('round1', DEFAULT_GAME_SETTINGS)).toBe(1);
    expect(roundPenaltyUnits('round2', DEFAULT_GAME_SETTINGS)).toBe(2);
    expect(roundPenaltyUnits('round3', DEFAULT_GAME_SETTINGS)).toBe(3);
    expect(roundPenaltyUnits('round4', DEFAULT_GAME_SETTINGS)).toBe(4);
  });

  it('nem tippelős fázisra hibát dob', () => {
    expect(() => roundPenaltyUnits('pyramid', DEFAULT_GAME_SETTINGS)).toThrow(GameEngineError);
  });
});

describe('GameEngine — 1-4. kör büntetése', () => {
  it('jó tippnél penaltyUnits 0', () => {
    const engine = buildDeterministicEngine();
    const result = engine.submitGuess('A', 'red'); // card(5, hearts) = piros, helyes
    expect(result.correct).toBe(true);
    expect(result.penaltyUnits).toBe(0);
  });

  it('rossz tippnél a kör sorszámával egyező kortyot kell innia (1/2/3/4)', () => {
    const engine = buildDeterministicEngine();

    const r1 = engine.submitGuess('A', 'black'); // valójában piros -> hibás
    expect(r1.correct).toBe(false);
    expect(r1.penaltyUnits).toBe(1);
    expect(r1.roundAdvanced).toBe(false);
    engine.acknowledgeRoundPenalty('A');

    const r1b = engine.submitGuess('B', 'red'); // valójában fekete -> hibás
    expect(r1b.correct).toBe(false);
    expect(r1b.penaltyUnits).toBe(1);
    engine.acknowledgeRoundPenalty('B');

    const r2 = engine.submitGuess('A', 'smaller'); // 9 > 5, tehát "nagyobb" lenne helyes
    expect(r2.correct).toBe(false);
    expect(r2.penaltyUnits).toBe(2);
    engine.acknowledgeRoundPenalty('A');

    const r2b = engine.submitGuess('B', 'bigger'); // 2 < 6, "kisebb" lenne helyes
    expect(r2b.correct).toBe(false);
    expect(r2b.penaltyUnits).toBe(2);
    engine.acknowledgeRoundPenalty('B');

    const r3 = engine.submitGuess('A', 'outside'); // 7 az 5 és 9 közt van, "közte" lenne helyes
    expect(r3.correct).toBe(false);
    expect(r3.penaltyUnits).toBe(3);
    engine.acknowledgeRoundPenalty('A');

    const r3b = engine.submitGuess('B', 'between'); // 10 a 2 és 6 határán kívül, "kívül" lenne helyes
    expect(r3b.correct).toBe(false);
    expect(r3b.penaltyUnits).toBe(3);
    engine.acknowledgeRoundPenalty('B');

    const r4 = engine.submitGuess('A', 'hearts'); // valójában diamonds
    expect(r4.correct).toBe(false);
    expect(r4.penaltyUnits).toBe(4);
    engine.acknowledgeRoundPenalty('A');

    const r4b = engine.submitGuess('B', 'clubs'); // valójában spades
    expect(r4b.correct).toBe(false);
    expect(r4b.penaltyUnits).toBe(4);
    engine.acknowledgeRoundPenalty('B');
  });

  it('nem lehet új tippet adni, amíg az előző büntetés nincs nyugtázva', () => {
    const engine = buildDeterministicEngine();
    engine.submitGuess('A', 'black'); // hibás, A-nak nyugtáznia kell

    expect(() => engine.submitGuess('B', 'black')).toThrow(GameEngineError);
    expect(() => engine.acknowledgeRoundPenalty('B')).toThrow(GameEngineError);

    engine.acknowledgeRoundPenalty('A');
    const next = engine.submitGuess('B', 'black');
    expect(next.correct).toBe(true);
  });

  it('jó tippnél automatikusan tovább lép, nyugtázás nélkül', () => {
    const engine = buildDeterministicEngine();
    const result = engine.submitGuess('A', 'red'); // helyes
    expect(result.roundAdvanced).toBe(false); // csak a következő játékosra lép a körön belül
    expect(engine.activePlayer.id).toBe('B');
  });
});

describe('GameEngine — busDeckRemaining', () => {
  it('a buszozás paklijának hátralévő lapszámát adja vissza, és húzásnál csökken', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);
    for (let i = 0; i < PYRAMID_SIZE; i++) engine.flipNextPyramidCard();
    engine.determineBusRider();

    const busDeck = new FixedCardSource([card(5, 'hearts'), card(9, 'spades'), card(3, 'clubs')]);
    engine.startBusRound(Math.random, busDeck);
    expect(engine.busDeckRemaining).toBe(3);

    engine.answerBus(engine.busRider as string, 'red'); // lehúz 1 lapot (redBlack kérdés)
    expect(engine.busDeckRemaining).toBe(2);
  });

  it('bus fázis előtt 0-t ad vissza', () => {
    const engine = buildDeterministicEngine();
    expect(engine.busDeckRemaining).toBe(0);
  });
});

describe('GameEngine — buszozó kiválasztása és négykérdéses buszozás', () => {
  it('akinek több lap maradt a kezében, az buszozik', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);
    engine.flipNextPyramidCard(); // revealIndex 0, card = 9 diamonds
    engine.playPyramidMatch('A', { suit: 'clubs', rank: 9 }, { B: 1 }); // A: 4 -> 3 lap, B marad 4-gyel
    for (let i = 1; i < PYRAMID_SIZE; i++) engine.flipNextPyramidCard();

    const decision = engine.determineBusRider();
    expect(decision.riderId).toBe('B');
    expect(decision.handSizes).toEqual({ A: 3, B: 4 });
  });

  it('a buszozó a négykérdéses sort hibátlanul teljesítve kiszáll, hiba esetén elölről kezdi', () => {
    const engine = buildDeterministicEngine();
    playToRoundsEnd(engine);
    engine.flipNextPyramidCard(); // revealIndex 0, card = 9 diamonds
    engine.playPyramidMatch('A', { suit: 'clubs', rank: 9 }, { B: 1 });
    for (let i = 1; i < PYRAMID_SIZE; i++) engine.flipNextPyramidCard();
    engine.determineBusRider(); // B buszozik

    const busDeck = new FixedCardSource([
      card(5, 'hearts'), // 1. próbálkozás: piros lap, de "fekete" tippet adunk — hibás
      card(6, 'hearts'), // 2. próbálkozás 1. lapja — piros, jó tipp
      card(9, 'spades'), // 2. nagyobb/kisebb a 6-hoz képest: nagyobb
      card(7, 'spades'), // 3. közte/kívül (6 és 9 közt): közte
      card(2, 'hearts'), // 4. szín: hearts
    ]);
    engine.startBusRound(Math.random, busDeck);
    expect(engine.phase).toBe('bus');
    expect(engine.busRider).toBe('B');

    expect(() => engine.answerBus('A', 'red')).toThrow(GameEngineError); // nem ő buszozik

    const wrong = engine.answerBus('B', 'black'); // tényleges lap piros, tipp fekete -> hibás
    expect(wrong.correct).toBe(false);
    expect(wrong.exitedBus).toBe(false);
    expect(engine.currentBusAttempt.questionIndex).toBe(0);

    const q1 = engine.answerBus('B', 'red');
    expect(q1.correct).toBe(true);
    const q2 = engine.answerBus('B', 'bigger');
    expect(q2.correct).toBe(true);
    const q3 = engine.answerBus('B', 'between');
    expect(q3.correct).toBe(true);
    const q4 = engine.answerBus('B', 'hearts');
    expect(q4.correct).toBe(true);
    expect(q4.exitedBus).toBe(true);
    expect(engine.phase).toBe('finished');
  });
});

describe('GameEngine — testre szabott GameSettings', () => {
  it('egyedi (2 körös) kör-lista, egyedi piramis-büntetés, és a buszozás ugyanazt a 2 kört futja', () => {
    const customSettings: GameSettings = {
      rounds: [
        { type: 'redBlack', penaltyUnits: 1 },
        { type: 'exactRank', penaltyUnits: 5 },
      ],
      pyramidRowPenalties: [2, 2, 2, 2, 2],
      pyramidFlipIntervalMs: 5000,
    };
    const queue = [
      card(5, 'hearts'), // A r1 — piros, helyes
      card(6, 'clubs'), // B r1 — fekete, helyes
      card(9, 'clubs'), // A r2 — pontos érték: 9, helyes
      card(2, 'hearts'), // B r2 — pontos érték: 2, helyes
      card(9, 'diamonds'), // piramis slot0 (rowValue 1) — egyezik A r2 (9-es) lapjával
      ...Array.from({ length: 14 }, () => card(13, 'clubs')), // piramis töltőlapok
    ];
    const deck = new FixedCardSource(queue);
    const engine = new GameEngine(
      [{ id: 'A', name: 'Anna' }, { id: 'B', name: 'Béla' }],
      Math.random,
      deck,
      customSettings,
    );
    engine.start();
    expect(engine.phase).toBe('round1');

    engine.submitGuess('A', 'red');
    engine.submitGuess('B', 'black');
    expect(engine.phase).toBe('round2');

    engine.submitGuess('A', 9);
    const last = engine.submitGuess('B', 2);
    expect(last.correct).toBe(true);
    // Csak 2 kör van konfigurálva — a 3. körhöz nem lehetne (és nem is kell) tovább lépni.
    expect(engine.phase).toBe('pyramid');

    engine.flipNextPyramidCard(); // revealIndex 0, rowValue 1, card = 9 diamonds

    // Az alapértelmezett piramis-büntetés 1 lenne — itt 2-nek kell lennie a testre
    // szabott pyramidRowPenalties[0] miatt.
    expect(() => engine.playPyramidMatch('A', { suit: 'clubs', rank: 9 }, { B: 1 })).toThrow(GameEngineError);
    const pyramidResult = engine.playPyramidMatch('A', { suit: 'clubs', rank: 9 }, { B: 2 });
    expect(pyramidResult.distribution).toEqual({ B: 2 });

    for (let i = 1; i < PYRAMID_SIZE; i++) engine.flipNextPyramidCard();

    const decision = engine.determineBusRider();
    // A leadta a 9-es lapját a piramisban (1 lapja marad), B-nek 2 lapja van — B buszozik.
    expect(decision.riderId).toBe('B');
    expect(decision.handSizes).toEqual({ A: 1, B: 2 });

    const busDeck = new FixedCardSource([
      card(3, 'hearts'), // 1. kérdés (redBlack): piros, helyes
      card(7, 'spades'), // 2. kérdés (exactRank): pontosan 7, helyes
    ]);
    engine.startBusRound(Math.random, busDeck);

    const busQ1 = engine.answerBus('B', 'red');
    expect(busQ1.correct).toBe(true);
    expect(busQ1.question).toBe('redBlack');
    expect(busQ1.exitedBus).toBe(false);

    // A régi, fix négykérdéses buszozásnál itt még 2 kérdés hátra lenne — a testre
    // szabott 2 körös listánál viszont ez már az utolsó kérdés, azonnal kiszáll.
    const busQ2 = engine.answerBus('B', 7);
    expect(busQ2.correct).toBe(true);
    expect(busQ2.question).toBe('exactRank');
    expect(busQ2.exitedBus).toBe(true);
    expect(engine.phase).toBe('finished');
  });
});
