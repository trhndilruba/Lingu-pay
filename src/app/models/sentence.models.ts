export type SentenceLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type SentenceTopic =
  | 'Daily Life'
  | 'School'
  | 'Hobbies'
  | 'Travel'
  | 'Food'
  | 'Work';

export interface SentenceItem {
  id: number;
  word: string;
  level: SentenceLevel;
  topic: SentenceTopic;
  sentence: string;
  translation: string;
}

export interface SentenceToken {
  id: number;
  text: string;
  originalIndex: number;
  selected: boolean;
  isEvaluated?: boolean;
  isCorrect?: boolean;
}
