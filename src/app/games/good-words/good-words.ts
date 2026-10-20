
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { RouterLink } from '@angular/router';

import { GameSessionService } from '../../core/game-session.service';
import {
  GameContentService,
  WordItem
} from '../../core/game-content.service';

import { GameRound } from '../../models/game.models';

import { BoardGeneratorService } from '../../services/board-generator.service';
import { DictionaryService } from '../../services/dictionary.service';

/* =========================
   CELL MODEL
   ========================= */

interface Cell {
  row: number;
  col: number;
}

/* =========================
   COMPONENT
   ========================= */

@Component({
  selector: 'app-good-words',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './good-words.html',
  styleUrl: './good-words.css'
})
export class GoodWords implements OnInit, OnDestroy {

  /* =========================
     QUESTIONS
     ========================= */

  words: WordItem[] = [];

  /* =========================
     CURRENT ROUND
     ========================= */

  currentRound: GameRound | null = null;
  currentWordIndex = 0;

  /* =========================
     PLAYER SELECTION
     ========================= */

  selectedCells: Cell[] = [];
  currentWord = '';

  /* =========================
     GAME STATUS
     ========================= */

  gameStatus: 'idle' | 'correct' | 'wrong' = 'idle';
  showFeedback = false;

  /* =========================
     TIMER
     ========================= */

  timeLeft = 120;
  timerId: ReturnType<typeof setInterval> | null = null;
  timeUp = false;

  /* =========================
     SCORE
     ========================= */

  score = 0;
  wordsFound = 0;

  private sessionSaved = false;
  private sessionSaving = false;
  private sessionStartedAt = 0;

  /* =========================
     CONSTRUCTOR
     ========================= */

  constructor(
    private boardGenerator: BoardGeneratorService,
    private dictionaryService: DictionaryService,
    private cdr: ChangeDetectorRef,
    private gameSessionService: GameSessionService,
    private gameContentService: GameContentService
  ) {}

  /* =========================
     COMPONENT INIT
     ========================= */

  ngOnInit(): void {
    void this.loadQuestions();
  }

  /* =========================
     LOAD QUESTIONS FROM FIRESTORE
     ========================= */

  async loadQuestions(): Promise<void> {
    try {
      const data = await this.gameContentService.getWords();

      this.words = data;

      if (this.words.length > 0) {
        this.loadRound(0);
      } else {
        console.warn(
          'Firestore words koleksiyonunda kelime bulunamadı.'
        );
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error(
        'Kelimeler Firestore üzerinden yüklenemedi:',
        error
      );
    }
  }

  /* =========================
     LOAD ROUND
     ========================= */

  loadRound(index: number): void {
    console.log('5 - loadRound started:', index);

    const wordItem = this.words[index];

    console.log('6 - selected word:', wordItem);

    if (!wordItem) {
      return;
    }

    /* Generate the letter board. */

    const board = this.boardGenerator.generateBoard(
      wordItem.word
    );

    console.log('7 - generated board:', board);

    /* Get the word definition. */

    this.dictionaryService
      .getDefinition(wordItem.word)
      .subscribe({
        next: (definition) => {
          console.log('8 - definition:', definition);

          this.currentRound = {
            word: wordItem.word,
            definition: definition,
            board: board
          };

          this.currentWordIndex = index;

          this.resetSelection();

          /* Start the timer only once. */

          if (
            this.timerId === null &&
            !this.timeUp &&
            !this.sessionSaved &&
            !this.sessionSaving
          ) {
            this.startTimer();
          }

          this.cdr.markForCheck();

          console.log(
            '9 - currentRound:',
            this.currentRound
          );
        },

        error: (error) => {
          console.error('Dictionary API error:', error);
        }
      });
  }

  /* =========================
     NEXT ROUND
     ========================= */

  loadNextRound(): void {
    if (this.words.length === 0) {
      return;
    }

    const nextIndex =
      (this.currentWordIndex + 1) % this.words.length;

    this.loadRound(nextIndex);
  }

  /* =========================
     SELECT CELL
     ========================= */

  selectCell(row: number, col: number): void {
    if (
      !this.currentRound ||
      this.timeUp ||
      this.gameStatus === 'correct'
    ) {
      return;
    }

    const cell: Cell = { row, col };

    /* Clicking the last selected cell removes it. */

    if (this.isSelected(row, col)) {
      this.removeLastSelectedCell(cell);
      return;
    }

    /* Select the first letter. */

    if (this.selectedCells.length === 0) {
      this.selectedCells.push(cell);

      this.currentWord +=
        this.currentRound.board[row][col];

      this.gameStatus = 'idle';

      this.cdr.markForCheck();
      return;
    }

    /* Check the new cell against the last selected cell. */

    const lastCell =
      this.selectedCells[this.selectedCells.length - 1];

    if (!this.isAdjacent(lastCell, cell)) {
      return;
    }

    /* Add the selected letter. */

    this.selectedCells.push(cell);

    this.currentWord +=
      this.currentRound.board[row][col];

    this.gameStatus = 'idle';

    this.cdr.markForCheck();
  }

  /* =========================
     CHECK SELECTED CELL
     ========================= */

  isSelected(row: number, col: number): boolean {
    return this.selectedCells.some(
      cell =>
        cell.row === row &&
        cell.col === col
    );
  }

  /* =========================
     AVAILABLE CELL
     ========================= */

  isAvailableCell(row: number, col: number): boolean {
    if (
      !this.currentRound ||
      this.timeUp ||
      this.gameStatus === 'correct' ||
      this.isSelected(row, col)
    ) {
      return false;
    }

    if (this.selectedCells.length === 0) {
      return true;
    }

    const lastCell =
      this.selectedCells[this.selectedCells.length - 1];

    return this.isAdjacent(lastCell, { row, col });
  }

  /* =========================
     REMOVE LAST CELL
     ========================= */

  removeLastSelectedCell(cell: Cell): void {
    if (this.selectedCells.length === 0) {
      return;
    }

    const lastCell =
      this.selectedCells[this.selectedCells.length - 1];

    /* Only the last selected cell can be removed. */

    if (
      lastCell.row === cell.row &&
      lastCell.col === cell.col
    ) {
      this.selectedCells.pop();

      this.currentWord = this.currentWord.slice(0, -1);

      this.gameStatus = 'idle';

      this.cdr.markForCheck();
    }
  }

  /* =========================
     CHECK ADJACENCY
     ========================= */

  isAdjacent(first: Cell, second: Cell): boolean {
    const rowDifference = Math.abs(
      first.row - second.row
    );

    const colDifference = Math.abs(
      first.col - second.col
    );

    return (
      rowDifference <= 1 &&
      colDifference <= 1 &&
      rowDifference + colDifference > 0
    );
  }

  /* =========================
     CELL STATUS
     ========================= */

  getCellStatus(
    row: number,
    col: number
  ): 'correct' | 'wrong' | 'none' {
    if (!this.currentRound) {
      return 'none';
    }

    const selectedIndex =
      this.selectedCells.findIndex(
        cell =>
          cell.row === row &&
          cell.col === col
      );

    if (selectedIndex === -1) {
      return 'none';
    }

    const selectedLetter =
      this.currentRound.board[row][col].toUpperCase();

    const expectedLetter =
      this.currentRound.word[selectedIndex].toUpperCase();

    if (selectedLetter === expectedLetter) {
      return 'correct';
    }

    return 'wrong';
  }

  /* =========================
     CHECK WORD
     ========================= */

  checkWord(): void {
    if (
      !this.currentRound ||
      this.timeUp ||
      this.gameStatus === 'correct' ||
      this.currentWord.length === 0
    ) {
      return;
    }

    if (
      this.currentWord.toUpperCase() ===
      this.currentRound.word.toUpperCase()
    ) {
      const earnedPoints = 100 + (this.timeLeft * 2);

      this.score += earnedPoints;
      this.wordsFound++;
      this.gameStatus = 'correct';
    } else {
      this.gameStatus = 'wrong';
    }

    this.cdr.markForCheck();
  }

  /* =========================
     RESET SELECTION
     ========================= */

  resetSelection(): void {
    this.selectedCells = [];
    this.currentWord = '';
    this.gameStatus = 'idle';

    this.cdr.markForCheck();
  }

  /* =========================
     START TIMER
     ========================= */

  startTimer(): void {
    if (
      this.timerId !== null ||
      this.timeUp ||
      this.sessionSaved ||
      this.sessionSaving
    ) {
      return;
    }

    /* Record the start time only once. */

    if (this.sessionStartedAt === 0) {
      this.sessionStartedAt = Date.now();
      this.timeLeft = 120;
    }

    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      }

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.timeUp = true;

        this.stopTimer();
        this.resetSelection();

        /* Save the result once the game ends. */

        void this.saveSessionOnce();
      }

      this.cdr.markForCheck();
    }, 1000);
  }

  /* =========================
     STOP TIMER
     ========================= */

  stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /* =========================
     SAVE GAME SESSION
     ========================= */

  private async saveSessionOnce(): Promise<void> {
    if (
      this.sessionSaved ||
      this.sessionSaving ||
      this.sessionStartedAt === 0
    ) {
      return;
    }

    this.sessionSaving = true;

    try {
      await this.gameSessionService.saveGameResult({
        gameType: 'good-words',
        score: this.score,
        correctAnswers: this.wordsFound,
        durationSeconds: Math.floor(
          (Date.now() - this.sessionStartedAt) / 1000
        )
      });

      this.sessionSaved = true;

      console.log(
        'Good Words sonucu Firestore’a kaydedildi.'
      );
    } catch (error) {
      console.error(
        'Oyun sonucu kaydedilemedi:',
        error
      );
    } finally {
      this.sessionSaving = false;
      this.cdr.markForCheck();
    }
  }

  /* =========================
     FORMATTED TIME
     ========================= */

  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;

    return (
      `${String(minutes).padStart(2, '0')}:` +
      `${String(seconds).padStart(2, '0')}`
    );
  }

  /* =========================
     RESTART GAME
     ========================= */

  restartGame(): void {
    this.stopTimer();

    this.timeLeft = 120;
    this.timeUp = false;

    this.score = 0;
    this.wordsFound = 0;

    this.sessionSaved = false;
    this.sessionSaving = false;
    this.sessionStartedAt = 0;

    this.currentWordIndex = 0;
    this.currentRound = null;

    this.selectedCells = [];
    this.currentWord = '';
    this.gameStatus = 'idle';
    this.showFeedback = false;

    if (this.words.length > 0) {
      this.loadRound(0);
    } else {
      void this.loadQuestions();
    }

    this.cdr.markForCheck();
  }

  /* =========================
     COMPONENT DESTROY
     ========================= */

  ngOnDestroy(): void {
    this.stopTimer();
  }
}
