import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map } from 'rxjs';
import {
  SentenceItem,
  SentenceLevel,
  SentenceToken
} from '../models/sentence.models';

@Injectable({
  providedIn: 'root'
})
export class SentenceService {
  private sentencesCache: SentenceItem[] | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Loads the local curated sentence dataset from public/sentences.json.
   * Caches results in memory for fast local lookups.
   */
  loadDataset(): Observable<SentenceItem[]> {
    if (this.sentencesCache) {
      return of(this.sentencesCache);
    }

    return this.http.get<SentenceItem[]>('sentences.json').pipe(
      tap((data) => {
        this.sentencesCache = data;
      })
    );
  }

  /**
   * Finds a suitable sentence from the local dataset matching:
   * - normalized word (case-insensitive, trimmed)
   * - English level (A1, A2, B1, B2)
   * - topic (Daily Life, School, etc.)
   * - avoids previously used sentence IDs if possible
   *
   * Returns null if no sentence exists.
   */
  getSentence(
    word: string,
    level: SentenceLevel,
    topic: string,
    excludedIds: number[] = []
  ): Observable<SentenceItem | null> {
    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord || !level || !topic) {
      return of(null);
    }

    return this.loadDataset().pipe(
      map((allSentences) => {
        // Filter by level and topic
        const levelAndTopicMatches = allSentences.filter((item) => {
          const matchLevel = item.level.toUpperCase() === level.toUpperCase();
          const matchTopic = item.topic.trim().toLowerCase() === topic.trim().toLowerCase();
          return matchLevel && matchTopic;
        });

        // Make sure the sentence actually contains the requested word (case-insensitively)
        const wordRegex = new RegExp('(?:^|[^a-zA-Z0-9])' + this.escapeRegex(normalizedWord) + '(?:$|[^a-zA-Z0-9])', 'i');

        const matchingSentences = levelAndTopicMatches.filter((item) => {
          const directWordMatch = item.word.trim().toLowerCase() === normalizedWord;
          const sentenceContainsWord = wordRegex.test(item.sentence) || item.sentence.toLowerCase().includes(normalizedWord);
          return directWordMatch || sentenceContainsWord;
        });

        if (matchingSentences.length === 0) {
          return null;
        }

        // Exclude already used sentence IDs to avoid repeating in the same game
        const unseenMatches = matchingSentences.filter(
          (item) => !excludedIds.includes(item.id)
        );

        const candidates = unseenMatches.length > 0 ? unseenMatches : matchingSentences;

        // Randomly select one matching sentence
        const randomIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randomIndex];
      })
    );
  }

  /**
   * Splits a sentence into unique SentenceToken items.
   * Strips outer punctuation while keeping contractions like "don't".
   */
  tokenize(sentence: string): SentenceToken[] {
    const rawTokens = sentence
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, ''))
      .filter((w) => w.length > 0);

    return rawTokens.map((text, index) => ({
      id: index,
      text,
      originalIndex: index,
      selected: false
    }));
  }

  /**
   * Shuffles tokens using Fisher-Yates.
   * Ensures the result is not already in the original order when length > 1.
   */
  shuffleTokens(tokens: SentenceToken[]): SentenceToken[] {
    const copy = tokens.map((t) => ({ ...t, selected: false }));
    if (copy.length <= 1) {
      return copy;
    }

    let attempts = 0;
    let isSameOrder = true;

    while (isSameOrder && attempts < 10) {
      attempts++;
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }

      isSameOrder = copy.every((t, idx) => t.originalIndex === idx);
    }

    // If still in same order after attempts, explicitly swap first two
    if (isSameOrder && copy.length > 1) {
      [copy[0], copy[1]] = [copy[1], copy[0]];
    }

    return copy;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^$${}()|[\]\\]/g, '\\$&');
  }
}
