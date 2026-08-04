export interface Word {
  _id: string;
  id?: string;
  englishWord: string;
  uzbekTranslation: string;
  exampleSentence?: string;
  audioUrl?: string;
  phonetic?: string;
}

export interface GameProps {
  word: Word;
  allWords: Word[];
  activityId: string;
  onCorrect: () => void;
  onWrong: () => void;
  speak: (text: string) => void;
  isCorrect?: boolean | null;
  onMatchPair?: () => void;
  onBonusTime?: (seconds: number) => void;
  onSetTimeLeft?: (seconds: number) => void;
}
