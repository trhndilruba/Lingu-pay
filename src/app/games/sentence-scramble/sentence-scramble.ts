import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSessionService } from '../../core/game-session.service';
import { SentenceService } from '../../services/sentence.service';
import {
  SentenceItem,
  SentenceLevel,
  SentenceTopic,
  SentenceToken
} from '../../models/sentence.models';

@Component({
  selector: 'app-sentence-scramble',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sentence-scramble.html',
  styleUrl: './sentence-scramble.css'
})
export class SentenceScramble {
  private sentenceService = inject(SentenceService);
  private cdr = inject(ChangeDetectorRef);
  private gameSessionService = inject(GameSessionService);
  // ========================================
  // SETUP STATE
  // ========================================
  wordInput = '';
  selectedLevel: SentenceLevel | null = null;
  selectedTopic: SentenceTopic = 'Daily Life';

  readonly topics: SentenceTopic[] = [
    'Daily Life',
    'School',
    'Hobbies',
    'Travel',
    'Food',
    'Work'
  ];

  readonly levels: SentenceLevel[] = ['A1', 'A2', 'B1', 'B2'];

  isGenerating = false;
  noSentenceFound = false;

  // ========================================
  // GAME STATE
  // ========================================
  gameStarted = false;
  gameOver = false;
  currentQuestionIndex = 0;
  readonly totalQuestions = 5;
  score = 0;
  correctAnswersCount = 0;
  lives = 5;

  private sessionStartedAt = 0;
  private sessionSaved = false;
  private sessionSaving = false;

  currentSentence: SentenceItem | null = null;
  originalTokens: SentenceToken[] = [];
  shuffledTokens: SentenceToken[] = [];
  selectedTokens: SentenceToken[] = [];

  usedSentenceIds: number[] = [];
  hasAnsweredCurrent = false;

  // Interactive controls state
  isHintActive = false;
  isTargetRevealed = false;
  isEvaluationComplete = false;
  isAudioPlaying = false;

  // Anchored feedback tray
  feedbackType: 'none' | 'success' | 'error' | 'warning' = 'none';
  feedbackMessage = '';

  // Backward-compatible modal state for tests
  activeModal: 'none' | 'correct' | 'wrong' = 'none';

  // ========================================
  // SETUP ACTIONS
  // ========================================
  selectLevel(level: SentenceLevel): void {
    this.selectedLevel = level;
    this.noSentenceFound = false;
  }

  selectTopic(topic: SentenceTopic): void {
    this.selectedTopic = topic;
    this.noSentenceFound = false;
  }

  onWordInputChange(): void {
    this.noSentenceFound = false;
  }

  /**
   * Starts the 5-question Sentence Scramble game session.
   */
  startNewGame(searchDelayMs = 600): void {
    const rawWord = this.wordInput.trim();
    if (!rawWord || !this.selectedLevel) {
      return;
    }

    this.isGenerating = true;
    this.noSentenceFound = false;

    // Simulate friendly UI search state (no external API)
    setTimeout(() => {
      this.sentenceService
        .getSentence(
          rawWord,
          this.selectedLevel!,
          this.selectedTopic,
          []
        )
        .subscribe((foundSentence) => {
          this.isGenerating = false;

          if (!foundSentence) {
            this.noSentenceFound = true;
            this.cdr.markForCheck();
            return;
          }

          // Initialize session
          this.gameStarted = true;
          this.gameOver = false;
          this.score = 0;
          this.correctAnswersCount = 0;
          this.currentQuestionIndex = 0;
          this.usedSentenceIds = [];
          this.lives = 5;
          this.sessionStartedAt = Date.now();
          this.sessionSaved = false;
          this.sessionSaving = false;
          this.setupQuestionWithSentence(foundSentence);
          this.cdr.markForCheck();
        });
    }, searchDelayMs);
  }

  /**
   * Loads the next question in the 5-question sequence.
   */
  loadNextSentence(): void {
    this.closeModal();
    this.hideFeedbackTray();
    this.isTargetRevealed = false;
    this.isHintActive = false;
    this.isEvaluationComplete = false;
    this.selectedTokens = [];

    if (this.currentQuestionIndex >= this.totalQuestions - 1) {
      // 5 questions completed
      this.gameOver = true;
      void this.saveSessionOnce();
      this.cdr.markForCheck();
      return;
    }

    const nextIndex = this.currentQuestionIndex + 1;
    this.sentenceService
      .getSentence(
        this.wordInput.trim(),
        this.selectedLevel!,
        this.selectedTopic,
        this.usedSentenceIds
      )
      .subscribe((sentence) => {
        if (!sentence) {
          // If no new sentences, reset used pool and try again
          this.sentenceService
            .getSentence(
              this.wordInput.trim(),
              this.selectedLevel!,
              this.selectedTopic,
              []
            )
            .subscribe((fallbackSentence) => {
              if (fallbackSentence) {
                this.currentQuestionIndex = nextIndex;
                this.setupQuestionWithSentence(fallbackSentence);
              } else {
                this.gameOver = true;
                void this.saveSessionOnce();
              }
              this.cdr.markForCheck();
            });
          return;
        }

        this.currentQuestionIndex = nextIndex;
        this.setupQuestionWithSentence(sentence);
        this.cdr.markForCheck();
      });
  }

  private setupQuestionWithSentence(sentence: SentenceItem): void {
    this.currentSentence = sentence;
    this.usedSentenceIds.push(sentence.id);
    this.hasAnsweredCurrent = false;
    this.isTargetRevealed = false;
    this.isHintActive = false;
    this.isEvaluationComplete = false;
    this.feedbackType = 'none';
    this.feedbackMessage = '';
    this.activeModal = 'none';

    // Tokenize target sentence
    this.originalTokens = this.sentenceService.tokenize(sentence.sentence);

    // Shuffle tokens
    this.shuffledTokens = this.sentenceService.shuffleTokens(this.originalTokens);

    // Reset answer area
    this.selectedTokens = [];
  }

  // ========================================
  // IN-GAME INTERACTIONS
  // ========================================

  /**
   * Selects a token from the word bank and moves it into the sentence receptacle.
   */
  selectToken(token: SentenceToken): void {
    if (token.selected) {
      return;
    }

    this.hideFeedbackTray();
    token.selected = true;
    this.selectedTokens.push({
      ...token,
      isEvaluated: false,
      isCorrect: false
    });

    this.reevaluatePlacedTokens();
  }

  /**
   * Removes a specific token from the sentence receptacle and returns it to the bank.
   * Handles duplicate words correctly by checking exact token id reference.
   */
  removeToken(tokenToRemove: SentenceToken): void {
    const foundIndex = this.selectedTokens.findIndex((t) => t.id === tokenToRemove.id);
    if (foundIndex === -1) {
      return;
    }

    this.hideFeedbackTray();
    this.selectedTokens.splice(foundIndex, 1);

    // Mark corresponding token in shuffledTokens as unselected
    const bankToken = this.shuffledTokens.find((t) => t.id === tokenToRemove.id);
    if (bankToken) {
      bankToken.selected = false;
    }

    this.reevaluatePlacedTokens();
  }

  /**
   * Undo: removes the last placed token and restores it to the word bank.
   */
  undo(): void {
    if (this.selectedTokens.length === 0) {
      return;
    }

    this.hideFeedbackTray();
    const lastToken = this.selectedTokens.pop()!;
    const bankToken = this.shuffledTokens.find((t) => t.id === lastToken.id);
    if (bankToken) {
      bankToken.selected = false;
    }

    this.reevaluatePlacedTokens();
  }

  /**
   * Clears all selected tokens, restoring all to the word bank.
   */
  clearAnswer(): void {
    if (this.selectedTokens.length === 0) {
      return;
    }

    this.hideFeedbackTray();
    this.selectedTokens.forEach((t) => {
      const bankToken = this.shuffledTokens.find((bt) => bt.id === t.id);
      if (bankToken) {
        bankToken.selected = false;
      }
    });

    this.selectedTokens = [];
    this.isHintActive = false;
  }

  /**
   * Hint Button Logic:
   * Case A: No words placed -> place the first target word in the first position.
   * Case B: Words already placed -> evaluate positions (green for correct, red for incorrect).
   */
  giveHint(): void {
    this.hideFeedbackTray();

    if (this.selectedTokens.length === 0) {
      // Case A: 0 words placed -> automatically place the first word of the target sentence
      if (this.originalTokens.length === 0) {
        return;
      }

      const firstTarget = this.originalTokens[0];
      const targetWordNorm = this.normalizeWord(firstTarget.text);

      const matchingToken = this.shuffledTokens.find(
        (t) => !t.selected && this.normalizeWord(t.text) === targetWordNorm
      );

      if (matchingToken) {
        matchingToken.selected = true;
        this.selectedTokens.push({
          ...matchingToken,
          isEvaluated: true,
          isCorrect: true
        });
        this.isHintActive = true;
      }
    } else {
      // Case B: 1 or more words placed -> evaluate positions against target sentence
      this.isHintActive = true;
      this.reevaluatePlacedTokens();
    }
  }

  /**
   * Recalculates evaluation colors for placed tokens if hint is active.
   */
  private reevaluatePlacedTokens(): void {
    if (!this.isHintActive) {
      return;
    }

    this.selectedTokens.forEach((token, index) => {
      token.isEvaluated = true;
      const expected = this.originalTokens[index];
      token.isCorrect = !!expected && this.normalizeWord(token.text) === this.normalizeWord(expected.text);
    });
  }

  private wordText(token: SentenceToken): string {
    return token.text || '';
  }

  /**
   * Toggles the display of the target English sentence in the reveal banner.
   */
  toggleShowCorrectAnswer(): void {
    this.isTargetRevealed = !this.isTargetRevealed;
  }

  /**
   * Closes the revealed-answer banner.
   */
  closeRevealedAnswer(): void {
    this.isTargetRevealed = false;
  }

  /**
   * Pronounces the English target sentence using Web Speech Synthesis.
   */
  playAudio(): void {
    if (!this.currentSentence) {
      return;
    }

    this.isAudioPlaying = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(this.currentSentence.sentence);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }

    setTimeout(() => {
      this.isAudioPlaying = false;
      this.cdr.markForCheck();
    }, 400);
  }

  /**
   * Compares the player's selected tokens with the original sentence order.
   */
  checkAnswer(): void {
    if (this.isEvaluationComplete) {
      this.loadNextSentence();
      return;
    }

    if (this.selectedTokens.length === 0 || !this.currentSentence) {
      this.showFeedback('warning', 'Lütfen önce kelimeleri yerleştirin.');
      return;
    }

    // Must have used all tokens to form a complete sentence
    const isLengthComplete = this.selectedTokens.length === this.originalTokens.length;

    // Word text comparison (handles capitalization and duplicate words)
    const matchesByText =
      isLengthComplete &&
      this.selectedTokens.every((selected, idx) => {
        const expected = this.originalTokens[idx];
        return (
          this.normalizeWord(selected.text) === this.normalizeWord(expected.text)
        );
      });

    // Exact originalIndex match
    const matchesByIndex =
      isLengthComplete &&
      this.selectedTokens.every((token, idx) => token.originalIndex === idx);

    // Evaluate token colors
    this.isHintActive = true;
    this.reevaluatePlacedTokens();

    if (matchesByText || matchesByIndex) {
      if (!this.hasAnsweredCurrent) {
        this.score += 100;
        this.correctAnswersCount++;
        this.hasAnsweredCurrent = true;
      }
      this.isEvaluationComplete = true;
      this.activeModal = 'correct';
      this.showFeedback('success', 'Harika! Cümleyi doğru oluşturdunuz. (+100 Puan)');
    } else {
      this.activeModal = 'wrong';
      this.showFeedback('error', 'Bazı kelimeler yanlış sırada. Tekrar deneyin veya ipucu alın.');
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
  this.cdr.markForCheck();

  try {
    await this.gameSessionService.saveGameResult({
      gameType: 'sentence-scramble',
      score: this.score,
      correctAnswers: this.correctAnswersCount,
      totalQuestions: this.totalQuestions,
      completedQuestions: Math.min(
        this.currentQuestionIndex + 1,
        this.totalQuestions
      ),
      durationSeconds: Math.floor(
        (Date.now() - this.sessionStartedAt) / 1000
      ),
      level: this.selectedLevel ?? undefined,
      topic: this.selectedTopic
    });

    this.sessionSaved = true;
    console.log('Sentence Scramble sonucu kaydedildi.');
  } catch (error) {
    console.error('Oyun sonucu kaydedilemedi:', error);
  } finally {
    this.sessionSaving = false;
    this.cdr.markForCheck();
  }
}


  private normalizeWord(word: string): string {
    return (word || '')
      .trim()
      .replace(/[.,!?;:"']/g, '')
      .toLowerCase();
  }

  showFeedback(type: 'success' | 'error' | 'warning', message: string): void {
    this.feedbackType = type;
    this.feedbackMessage = message;
  }

  hideFeedbackTray(): void {
    this.feedbackType = 'none';
    this.feedbackMessage = '';
    if (this.isEvaluationComplete) {
      this.isEvaluationComplete = false;
    }
  }

  // ========================================
  // NAVIGATION ACTIONS
  // ========================================

  closeModal(): void {
    this.activeModal = 'none';
  }

  onBackToSetup(): void {
    this.gameStarted = false;
    this.gameOver = false;
    this.activeModal = 'none';
    this.noSentenceFound = false;
    this.selectedTokens = [];
    this.shuffledTokens = [];
    this.originalTokens = [];
    this.isTargetRevealed = false;
    this.isHintActive = false;
    this.isEvaluationComplete = false;
    this.feedbackType = 'none';
  }

  playAgain(): void {
    this.gameOver = false;
    this.gameStarted = false;
    this.score = 0;
    this.correctAnswersCount = 0;
    this.currentQuestionIndex = 0;
    this.usedSentenceIds = [];
    this.lives = 5;
    this.activeModal = 'none';
    this.selectedTokens = [];
    this.shuffledTokens = [];
    this.originalTokens = [];
    this.isTargetRevealed = false;
    this.isHintActive = false;
    this.isEvaluationComplete = false;
    this.feedbackType = 'none';
    this.sessionStartedAt = 0;
    this.sessionSaved = false;
    this.sessionSaving = false;
  }

  get progressPercentage(): number {
    return Math.round(((this.currentQuestionIndex + 1) / this.totalQuestions) * 100);
  }

  get availableTokensCount(): number {
    return this.shuffledTokens.filter((t) => !t.selected).length;
  }
}
