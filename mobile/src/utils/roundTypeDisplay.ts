import type { RoundType } from '../types/game';

/** A kör kérdés-címe (Round és Bus képernyőn egyaránt ez jelenik meg). */
export const roundTypeTitles: Record<RoundType, string> = {
  redBlack: 'Piros vagy fekete?',
  biggerSmaller: 'Nagyobb vagy kisebb?',
  betweenOutside: 'Közte vagy kívül?',
  suit: 'Milyen szín?',
  seenBefore: 'Volt már ilyen érték?',
  exactRank: 'Pontosan melyik érték?',
};

/** Rövid név a Játékbeállítások lista-nézetéhez. */
export const roundTypeShortLabels: Record<RoundType, string> = {
  redBlack: 'Piros / fekete',
  biggerSmaller: 'Nagyobb / kisebb',
  betweenOutside: 'Közte / kívül',
  suit: 'Szín',
  seenBefore: 'Volt már?',
  exactRank: 'Pontos érték',
};
