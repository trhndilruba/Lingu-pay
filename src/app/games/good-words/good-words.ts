import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { GameSessionService } from '../../core/game-session.service';
import { HttpClient } from '@angular/common/http';

import {
  WordItem,
  GameRound
} from '../../models/game.models';

import {
  BoardGeneratorService
} from '../../services/board-generator.service';

import {
  DictionaryService
} from '../../services/dictionary.service';

import { RouterLink } from '@angular/router';
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
    private http: HttpClient,
    private boardGenerator: BoardGeneratorService,
    private dictionaryService: DictionaryService,
    private cdr: ChangeDetectorRef,
    private gameSessionService: GameSessionService
  ) {}


  /* =========================
     COMPONENT INIT
     ========================= */

  ngOnInit(): void {
    this.loadQuestions();
  }


  /* =========================
     LOAD QUESTIONS
     ========================= */

  loadQuestions(): void {

    this.http
      .get<WordItem[]>('/words.json')
      .subscribe({

        next: (data) => {

          this.words = data;

          if (this.words.length > 0) {
            this.loadRound(0);
          }

        },

        error: (error) => {

          console.error(
            'Questions could not be loaded:',
            error
          );

        }

      });
  }


  /* =========================
     LOAD ROUND
     ========================= */

  loadRound(index: number): void {

    console.log(
      '5 - loadRound started:',
      index
    );

    const wordItem = this.words[index];

    console.log(
      '6 - selected word:',
      wordItem
    );

    if (!wordItem) {
      return;
    }


    /* =========================
       GENERATE BOARD
       ========================= */

    const board =
      this.boardGenerator.generateBoard(
        wordItem.word
      );

    console.log(
      '7 - generated board:',
      board
    );


    /* =========================
       GET DEFINITION
       ========================= */

    this.dictionaryService
      .getDefinition(wordItem.word)
      .subscribe({

        next: (definition) => {

          console.log(
            '8 - definition:',
            definition
          );


          this.currentRound = {
            word: wordItem.word,
            definition: definition,
            board: board
          };


          this.currentWordIndex = index;


          /* =========================
             RESET PREVIOUS SELECTION
             ========================= */

          this.resetSelection();


          /* =========================
             START TIMER
             ========================= */

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

          console.error(
            'Dictionary API error:',
            error
          );

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
      (this.currentWordIndex + 1) %
      this.words.length;


    this.loadRound(nextIndex);
  }


  /* =========================
     SELECT CELL
     ========================= */

  selectCell(
    row: number,
    col: number
  ): void {

    /* =========================
       BASIC CONTROLS
       ========================= */

    if (
      !this.currentRound ||
      this.timeUp ||
      this.gameStatus === 'correct'
    ) {
      return;
    }


    const cell: Cell = {
      row,
      col
    };


    /* =========================
       CLICK LAST SELECTED CELL
       =========================

       Eğer kullanıcı son seçtiği
       hücreye tekrar tıklarsa,
       son harfi geri alıyoruz.
    */

    if (this.isSelected(row, col)) {

      this.removeLastSelectedCell(cell);

      return;
    }


    /* =========================
       FIRST LETTER
       ========================= */

    if (this.selectedCells.length === 0) {

      this.selectedCells.push(cell);

      this.currentWord +=
        this.currentRound.board[row][col];

      this.gameStatus = 'idle';

      this.cdr.markForCheck();

      return;
    }


    /* =========================
       LAST SELECTED CELL
       ========================= */

    const lastCell =
      this.selectedCells[
        this.selectedCells.length - 1
      ];


    /* =========================
       ADJACENCY CHECK
       ========================= */

    if (!this.isAdjacent(lastCell, cell)) {

      return;
    }


    /* =========================
       ADD NEW CELL
       ========================= */

    this.selectedCells.push(cell);

    this.currentWord +=
      this.currentRound.board[row][col];


    /*
      Yanlış bir harf seçilse bile
      oyunu durdurmuyoruz.

      Çünkü kullanıcıya kırmızı/yeşil
      görsel ipucu vermek istiyoruz.
    */

    this.gameStatus = 'idle';

    this.cdr.markForCheck();
  }


  /* =========================
     CHECK SELECTED CELL
     ========================= */

  isSelected(
    row: number,
    col: number
  ): boolean {

    return this.selectedCells.some(
      cell =>
        cell.row === row &&
        cell.col === col
    );
  }


  /* =========================
     AVAILABLE CELL
     ========================= */

  isAvailableCell(
    row: number,
    col: number
  ): boolean {

    if (
      !this.currentRound ||
      this.timeUp ||
      this.gameStatus === 'correct' ||
      this.isSelected(row, col)
    ) {
      return false;
    }


    /* =========================
       FIRST CELL
       ========================= */

    if (this.selectedCells.length === 0) {
      return true;
    }


    /* =========================
       LAST CELL
       ========================= */

    const lastCell =
      this.selectedCells[
        this.selectedCells.length - 1
      ];


    return this.isAdjacent(
      lastCell,
      {
        row,
        col
      }
    );
  }


  /* =========================
     REMOVE LAST CELL
     ========================= */

  removeLastSelectedCell(
    cell: Cell
  ): void {

    if (this.selectedCells.length === 0) {
      return;
    }


    const lastCell =
      this.selectedCells[
        this.selectedCells.length - 1
      ];


    /*
      Sadece son seçilen hücre
      geri alınabilir.
    */

    if (
      lastCell.row === cell.row &&
      lastCell.col === cell.col
    ) {

      this.selectedCells.pop();


      this.currentWord =
        this.currentWord.slice(0, -1);


      this.gameStatus = 'idle';


      this.cdr.markForCheck();
    }
  }


  /* =========================
     CHECK ADJACENCY
     =========================

     Yatay
     Dikey
     Çapraz

     hareketlere izin verir.
  */

  isAdjacent(
    first: Cell,
    second: Cell
  ): boolean {

    const rowDifference =
      Math.abs(
        first.row - second.row
      );

    const colDifference =
      Math.abs(
        first.col - second.col
      );


    return (
      rowDifference <= 1 &&
      colDifference <= 1 &&
      (
        rowDifference +
        colDifference > 0
      )
    );
  }


  /* =========================
     CELL STATUS
     =========================

     Bu metod tahtadaki seçilen
     harfin doğru mu yanlış mı
     olduğunu belirler.

     correct → yeşil
     wrong   → kırmızı
     none    → normal
  */

  getCellStatus(
    row: number,
    col: number
  ): 'correct' | 'wrong' | 'none' {

    if (!this.currentRound) {
      return 'none';
    }


    /* =========================
       FIND SELECTED CELL INDEX
       ========================= */

    const selectedIndex =
      this.selectedCells.findIndex(
        cell =>
          cell.row === row &&
          cell.col === col
      );


    /*
      Hücre seçilmediyse
      herhangi bir renk verme.
    */

    if (selectedIndex === -1) {
      return 'none';
    }


    /* =========================
       SELECTED LETTER
       ========================= */

    const selectedLetter =
      this.currentRound.board[row][col]
        .toUpperCase();


    /* =========================
       EXPECTED LETTER
       =========================

       Örneğin:

       APPLE

       0 → A
       1 → P
       2 → P
       3 → L
       4 → E
    */

    const expectedLetter =
      this.currentRound.word[selectedIndex]
        .toUpperCase();


    /* =========================
       COMPARE
       ========================= */

    if (
      selectedLetter ===
      expectedLetter
    ) {

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
  // Zamanlayıcı zaten çalışıyorsa yeniden başlatma.
  if (
    this.timerId !== null ||
    this.timeUp ||
    this.sessionSaved ||
    this.sessionSaving
  ) {
    return;
  }

  // Oyun başlangıç zamanını yalnızca bir kez kaydet.
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

      // Sonucu yalnızca bir kez kaydet.
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

      clearInterval(
        this.timerId
      );

      this.timerId = null;
    }
  }

  

  
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
    console.log('Good Words sonucu Firestore’a kaydedildi.');
  } catch (error) {
    console.error('Oyun sonucu kaydedilemedi:', error);
  } finally {
    this.sessionSaving = false;
    this.cdr.markForCheck();
  }
}



  /* =========================
     FORMATTED TIME
     ========================= */

  get formattedTime(): string {

    const minutes =
      Math.floor(
        this.timeLeft / 60
      );


    const seconds =
      this.timeLeft % 60;


    return (
      `${String(minutes).padStart(2, '0')}:` +
      `${String(seconds).padStart(2, '0')}`
    );
  }



  
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
    this.loadQuestions();
  }

  this.cdr.markForCheck();
}
  
  ngOnDestroy(): void {

    this.stopTimer();
  }

}