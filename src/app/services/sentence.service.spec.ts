import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController
} from '@angular/common/http/testing';
import { SentenceService } from './sentence.service';
import { SentenceItem } from '../models/sentence.models';

describe('SentenceService', () => {
  let service: SentenceService;
  let httpMock: HttpTestingController;

  const mockSentences: SentenceItem[] = [
    {
      id: 1,
      word: 'school',
      level: 'A1',
      topic: 'School',
      sentence: 'I study English at school.',
      translation: 'Okulda İngilizce çalışırım.'
    },
    {
      id: 2,
      word: 'school',
      level: 'A1',
      topic: 'Daily Life',
      sentence: 'I go to school every day.',
      translation: 'Her gün okula giderim.'
    },
    {
      id: 3,
      word: 'apple',
      level: 'A1',
      topic: 'Food',
      sentence: 'I eat an apple every morning.',
      translation: 'Her sabah bir elma yerim.'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SentenceService
      ]
    });
    service = TestBed.inject(SentenceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should find matching sentence for word, level, and topic', () => {
    service.getSentence('school', 'A1', 'School').subscribe((result) => {
      expect(result).toBeTruthy();
      expect(result?.id).toBe(1);
      expect(result?.sentence).toBe('I study English at school.');
    });

    const req = httpMock.expectOne('sentences.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockSentences);
  });

  it('should return null when no sentence matches', () => {
    service.getSentence('nonexistent', 'B2', 'Work').subscribe((result) => {
      expect(result).toBeNull();
    });

    const req = httpMock.expectOne('sentences.json');
    req.flush(mockSentences);
  });

  it('should tokenize sentences and assign unique IDs to each token', () => {
    const tokens = service.tokenize('I like to play and I like to read.');
    expect(tokens.length).toBe(9);
    // Duplicate "I" check
    const iTokens = tokens.filter((t) => t.text.toLowerCase() === 'i');
    expect(iTokens.length).toBe(2);
    expect(iTokens[0].id).not.toBe(iTokens[1].id);
    expect(tokens[0].id).toBe(0);
    expect(tokens[0].text).toBe('I');
    expect(tokens[tokens.length - 1].text).toBe('read');
  });

  it('should shuffle tokens while maintaining token integrity', () => {
    const tokens = service.tokenize('The quick brown fox jumps');
    const shuffled = service.shuffleTokens(tokens);
    expect(shuffled.length).toBe(tokens.length);
    const originalIds = tokens.map((t) => t.id).sort();
    const shuffledIds = shuffled.map((t) => t.id).sort();
    expect(shuffledIds).toEqual(originalIds);
  });
});
