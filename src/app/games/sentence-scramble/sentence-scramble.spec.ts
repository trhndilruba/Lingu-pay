import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SentenceScramble } from './sentence-scramble';
import { SentenceService } from '../../services/sentence.service';
import { SentenceItem, SentenceToken } from '../../models/sentence.models';

describe('SentenceScramble', () => {
  let component: SentenceScramble;
  let fixture: ComponentFixture<SentenceScramble>;

  const mockSentence: SentenceItem = {
    id: 1,
    word: 'school',
    level: 'A1',
    topic: 'School',
    sentence: 'I go to school every day.',
    translation: 'Her gün okula giderim.'
  };

  const mockSentenceWithTurkishChars: SentenceItem = {
    id: 2,
    word: 'school',
    level: 'A1',
    topic: 'School',
    sentence: 'Our teacher arrives at school early.',
    translation: 'Öğretmenimiz okula erken gelir.'
  };

  const mockSentenceRepeatedWords: SentenceItem = {
    id: 196,
    word: 'book',
    level: 'A1',
    topic: 'School',
    sentence: 'I keep my notebook and book in my bag.',
    translation: 'Defterimi ve kitabımı çantamda tutarım.'
  };

  const mockTokens: SentenceToken[] = [
    { id: 0, text: 'I', originalIndex: 0, selected: false },
    { id: 1, text: 'go', originalIndex: 1, selected: false },
    { id: 2, text: 'to', originalIndex: 2, selected: false },
    { id: 3, text: 'school', originalIndex: 3, selected: false },
    { id: 4, text: 'every', originalIndex: 4, selected: false },
    { id: 5, text: 'day', originalIndex: 5, selected: false }
  ];

  let mockSentenceService: Partial<SentenceService>;

  beforeEach(async () => {
    mockSentenceService = {
      getSentence: vi.fn().mockReturnValue(of(mockSentence)),
      tokenize: vi.fn().mockImplementation((s: string) => [...mockTokens.map((t) => ({ ...t }))]),
      shuffleTokens: vi.fn().mockImplementation(() => [
        { ...mockTokens[4] },
        { ...mockTokens[3] },
        { ...mockTokens[0] },
        { ...mockTokens[5] },
        { ...mockTokens[1] },
        { ...mockTokens[2] }
      ])
    };

    await TestBed.configureTestingModule({
      imports: [SentenceScramble],
      providers: [
        provideHttpClient(),
        { provide: SentenceService, useValue: mockSentenceService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SentenceScramble);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with setup screen', () => {
    expect(component.gameStarted).toBe(false);
    expect(component.gameOver).toBe(false);
    expect(component.wordInput).toBe('');
    expect(component.selectedLevel).toBeNull();
  });

  it('should update level and topic on selection', () => {
    component.selectLevel('A2');
    expect(component.selectedLevel).toBe('A2');

    component.selectTopic('Travel');
    expect(component.selectedTopic).toBe('Travel');
  });

  it('should start game and initialize tokens when sentence is found', async () => {
    component.wordInput = 'school';
    component.selectLevel('A1');
    component.selectTopic('School');

    component.startNewGame(10);
    await new Promise((r) => setTimeout(r, 60));

    expect(component.gameStarted).toBe(true);
    expect(component.currentQuestionIndex).toBe(0);
    expect(component.score).toBe(0);
    expect(component.shuffledTokens.length).toBe(6);
    expect(component.selectedTokens.length).toBe(0);
    expect(component.currentSentence?.translation).toBe('Her gün okula giderim.');
  });

  it('should display no sentence found when service returns null', async () => {
    (mockSentenceService.getSentence as any).mockReturnValue(of(null));
    component.wordInput = 'unicorn';
    component.selectLevel('B2');

    component.startNewGame(10);
    await new Promise((r) => setTimeout(r, 60));

    expect(component.gameStarted).toBe(false);
    expect(component.noSentenceFound).toBe(true);
  });

  it('should add token to selected area and mark it as selected in bank', () => {
    const token = { id: 0, text: 'I', originalIndex: 0, selected: false };
    component.shuffledTokens = [token];
    component.selectToken(token);

    expect(token.selected).toBe(true);
    expect(component.selectedTokens.length).toBe(1);
    expect(component.selectedTokens[0].id).toBe(0);
  });

  it('should remove specific token and unmark it in bank', () => {
    const token1 = { id: 0, text: 'I', originalIndex: 0, selected: true };
    const token2 = { id: 1, text: 'go', originalIndex: 1, selected: true };
    component.shuffledTokens = [token1, token2];
    component.selectedTokens = [token1, token2];

    component.removeToken(token1);

    expect(component.selectedTokens.length).toBe(1);
    expect(component.selectedTokens[0].id).toBe(1);
    expect(token1.selected).toBe(false);
    expect(token2.selected).toBe(true);
  });

  it('should correctly handle duplicate words as distinct tokens', () => {
    const duplicate1 = { id: 0, text: 'like', originalIndex: 1, selected: false };
    const duplicate2 = { id: 5, text: 'like', originalIndex: 6, selected: false };
    component.shuffledTokens = [duplicate1, duplicate2];

    component.selectToken(duplicate1);
    expect(duplicate1.selected).toBe(true);
    expect(duplicate2.selected).toBe(false);
    expect(component.selectedTokens.length).toBe(1);
    expect(component.selectedTokens[0].id).toBe(0);

    component.selectToken(duplicate2);
    expect(duplicate2.selected).toBe(true);
    expect(component.selectedTokens.length).toBe(2);
  });

  it('should clear all selected tokens on clearAnswer', () => {
    const token1 = { id: 0, text: 'I', originalIndex: 0, selected: true };
    const token2 = { id: 1, text: 'go', originalIndex: 1, selected: true };
    component.shuffledTokens = [token1, token2];
    component.selectedTokens = [token1, token2];

    component.clearAnswer();

    expect(component.selectedTokens.length).toBe(0);
    expect(token1.selected).toBe(false);
    expect(token2.selected).toBe(false);
    expect(component.isHintActive).toBe(false);
  });

  it('should undo last placed token on undo()', () => {
    const token1 = { id: 0, text: 'I', originalIndex: 0, selected: true };
    const token2 = { id: 1, text: 'go', originalIndex: 1, selected: true };
    component.shuffledTokens = [token1, token2];
    component.selectedTokens = [{ ...token1 }, { ...token2 }];

    component.undo();

    expect(component.selectedTokens.length).toBe(1);
    expect(component.selectedTokens[0].id).toBe(0);
    expect(token2.selected).toBe(false);
    expect(token1.selected).toBe(true);
  });

  it('should award 100 points and show success state on correct answer', () => {
    component.currentSentence = mockSentence;
    component.originalTokens = [...mockTokens];
    component.selectedTokens = [...mockTokens];

    component.checkAnswer();

    expect(component.score).toBe(100);
    expect(component.correctAnswersCount).toBe(1);
    expect(component.activeModal).toBe('correct');
    expect(component.feedbackType).toBe('success');
    expect(component.isEvaluationComplete).toBe(true);
  });

  it('should show error state on incorrect answer without ending game', () => {
    component.currentSentence = mockSentence;
    component.originalTokens = [...mockTokens];
    component.selectedTokens = [...mockTokens].reverse();

    component.checkAnswer();

    expect(component.score).toBe(0);
    expect(component.activeModal).toBe('wrong');
    expect(component.feedbackType).toBe('error');
    expect(component.gameOver).toBe(false);
  });

  it('should close modal when closeModal is called', () => {
    component.activeModal = 'wrong';
    component.closeModal();
    expect(component.activeModal).toBe('none');
  });

  // ========================================================
  // NEW STITCH-INTEGRATED FEATURE TESTS
  // ========================================================

  it('should place first target word when Hint is clicked with 0 words placed (Case A)', () => {
    component.currentSentence = mockSentence;
    component.originalTokens = [...mockTokens];
    component.shuffledTokens = mockTokens.map((t) => ({ ...t, selected: false }));
    component.selectedTokens = [];

    component.giveHint();

    expect(component.selectedTokens.length).toBe(1);
    expect(component.selectedTokens[0].text).toBe('I');
    expect(component.selectedTokens[0].isEvaluated).toBe(true);
    expect(component.selectedTokens[0].isCorrect).toBe(true);

    const bankToken = component.shuffledTokens.find((t) => t.id === component.selectedTokens[0].id);
    expect(bankToken?.selected).toBe(true);
  });

  it('should not duplicate first word if Hint is clicked repeatedly when empty', () => {
    component.currentSentence = mockSentence;
    component.originalTokens = [...mockTokens];
    component.shuffledTokens = mockTokens.map((t) => ({ ...t, selected: false }));
    component.selectedTokens = [];

    component.giveHint();
    expect(component.selectedTokens.length).toBe(1);

    // Second click: now selectedTokens.length > 0 -> should evaluate, NOT insert duplicate
    component.giveHint();
    expect(component.selectedTokens.length).toBe(1);
  });

  it('should evaluate placed words green and red when Hint is clicked with placed words (Case B)', () => {
    component.currentSentence = mockSentence;
    component.originalTokens = [...mockTokens]; // "I", "go", "to", "school", "every", "day"

    // Place "I" (correct for pos 0), and "school" (incorrect for pos 1)
    const tokenI = { ...mockTokens[0], selected: true };
    const tokenSchool = { ...mockTokens[3], selected: true };
    component.shuffledTokens = [...mockTokens];
    component.selectedTokens = [{ ...tokenI }, { ...tokenSchool }];

    component.giveHint();

    expect(component.selectedTokens.length).toBe(2);
    expect(component.selectedTokens[0].isEvaluated).toBe(true);
    expect(component.selectedTokens[0].isCorrect).toBe(true); // "I" at index 0 is correct

    expect(component.selectedTokens[1].isEvaluated).toBe(true);
    expect(component.selectedTokens[1].isCorrect).toBe(false); // "school" at index 1 is incorrect (expected "go")
  });

  it('should recalculate evaluation colors dynamically when a token is added, removed, or undone', () => {
    component.currentSentence = mockSentence;
    component.originalTokens = [...mockTokens];
    component.shuffledTokens = mockTokens.map((t) => ({ ...t, selected: false }));

    // Place "I" and "to"
    const t0 = component.shuffledTokens[0]; // "I"
    const t2 = component.shuffledTokens[2]; // "to"
    component.selectToken(t0);
    component.selectToken(t2);

    // Trigger hint
    component.giveHint();
    expect(component.selectedTokens[0].isCorrect).toBe(true);  // "I" at pos 0 is correct
    expect(component.selectedTokens[1].isCorrect).toBe(false); // "to" at pos 1 is incorrect

    // Undo: removes "to"
    component.undo();
    expect(component.selectedTokens.length).toBe(1);
    expect(component.selectedTokens[0].isCorrect).toBe(true);

    // Add "go" at pos 1
    const t1 = component.shuffledTokens[1]; // "go"
    component.selectToken(t1);
    expect(component.selectedTokens.length).toBe(2);
    expect(component.selectedTokens[1].isCorrect).toBe(true); // "go" at pos 1 is now correct!
  });

  it('should toggle and close the revealed answer banner without awarding points or changing selection', () => {
    component.currentSentence = mockSentence;
    component.score = 50;
    component.selectedTokens = [];

    expect(component.isTargetRevealed).toBe(false);

    component.toggleShowCorrectAnswer();
    expect(component.isTargetRevealed).toBe(true);
    expect(component.score).toBe(50);
    expect(component.selectedTokens.length).toBe(0);

    component.closeRevealedAnswer();
    expect(component.isTargetRevealed).toBe(false);
    expect(component.score).toBe(50);
  });

  it('should support Turkish-specific characters in translation', () => {
    component.currentSentence = mockSentenceWithTurkishChars;
    expect(component.currentSentence.translation).toContain('Öğretmenimiz');
    expect(component.currentSentence.translation).toContain('gelir');
    // Check Turkish chars presence: Ö, ğ, ı
    expect(/[çğıİöşü]/i.test(component.currentSentence.translation)).toBe(true);
  });

  it('should handle repeated words cleanly in tokenization and selection', () => {
    const repeatedSentence = 'I like dogs and I like cats.';
    const tokens = new SentenceService({} as any).tokenize(repeatedSentence);
    const likeTokens = tokens.filter((t) => t.text.toLowerCase() === 'like');
    expect(likeTokens.length).toBe(2);
    expect(likeTokens[0].id).not.toBe(likeTokens[1].id);

    component.currentSentence = mockSentenceRepeatedWords;
    component.originalTokens = tokens;
    component.shuffledTokens = tokens.map((t) => ({ ...t, selected: false }));

    // Select first "like"
    component.selectToken(likeTokens[0]);
    expect(likeTokens[0].selected).toBe(true);
    expect(likeTokens[1].selected).toBe(false);

    // Select second "like"
    component.selectToken(likeTokens[1]);
    expect(likeTokens[1].selected).toBe(true);
    expect(component.selectedTokens.length).toBe(2);
  });

  it('should reset per-question state when loading next sentence', () => {
    component.currentSentence = mockSentence;
    component.selectedTokens = [{ ...mockTokens[0], selected: true }];
    component.isHintActive = true;
    component.isTargetRevealed = true;
    component.isEvaluationComplete = true;
    component.currentQuestionIndex = 0;

    component.loadNextSentence();

    expect(component.selectedTokens.length).toBe(0);
    expect(component.isHintActive).toBe(false);
    expect(component.isTargetRevealed).toBe(false);
    expect(component.isEvaluationComplete).toBe(false);
    expect(component.currentQuestionIndex).toBe(1);
  });
});
