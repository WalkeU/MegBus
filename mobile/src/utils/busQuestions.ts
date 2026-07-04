import { BUS_QUESTIONS, type BusQuestion } from '../types/game';

export const busQuestionTitles: Record<BusQuestion, string> = {
  redBlack: 'Piros vagy fekete?',
  biggerSmaller: 'Nagyobb vagy kisebb?',
  betweenOutside: 'Közte vagy kívül?',
  suit: 'Milyen szín?',
};

export function nextBusQuestion(current: BusQuestion): BusQuestion | null {
  const index = BUS_QUESTIONS.indexOf(current);
  const next = BUS_QUESTIONS[index + 1];
  return next ?? null;
}

export function roundTitleForPhase(
  phase: 'round1' | 'round2' | 'round3' | 'round4',
): string {
  switch (phase) {
    case 'round1':
      return busQuestionTitles.redBlack;
    case 'round2':
      return busQuestionTitles.biggerSmaller;
    case 'round3':
      return busQuestionTitles.betweenOutside;
    case 'round4':
      return busQuestionTitles.suit;
  }
}

export function penaltyUnitsForPhase(
  phase: 'round1' | 'round2' | 'round3' | 'round4',
): number {
  switch (phase) {
    case 'round1':
      return 1;
    case 'round2':
      return 2;
    case 'round3':
      return 3;
    case 'round4':
      return 4;
  }
}
