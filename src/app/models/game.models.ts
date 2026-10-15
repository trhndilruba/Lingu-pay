export interface WordItem {
  id: number;
  word: string;
}

export interface GameRound {
  word: string;
  definition: string;
  board: string[][];
}