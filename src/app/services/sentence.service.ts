
import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import {
  SentenceItem,
  SentenceLevel,
  SentenceToken
} from '../models/sentence.models';

import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

import { db } from '../core/firebase';

@Injectable({
  providedIn: 'root'
})
export class SentenceService {
  private sentencesCache$: Observable<SentenceItem[]> | null = null;

  /**
   * Cümleleri Firestore'daki sentences koleksiyonundan yükler.
   * Sonuçları bellekte önbelleğe alır.
   */
  loadDataset(): Observable<SentenceItem[]> {
    if (this.sentencesCache$) {
      return this.sentencesCache$;
    }

    const sentencesQuery = query(
      collection(db, 'sentences'),
      orderBy('id')
    );

    this.sentencesCache$ = from(getDocs(sentencesQuery)).pipe(
      map((snapshot) =>
        snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: Number(data['id'] ?? document.id),
            word: String(data['word'] ?? ''),
            level: String(data['level'] ?? ''),
            topic: String(data['topic'] ?? ''),
            sentence: String(data['sentence'] ?? ''),
            translation: String(data['translation'] ?? '')
          } as SentenceItem;
        })
      ),
      shareReplay(1)
    );

    return this.sentencesCache$;
  }

  /**
   * Kelime, seviye ve konuya uygun rastgele bir cümle seçer.
   * Mümkün olduğunda aynı oyun içinde kullanılan cümleleri atlar.
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
        const levelAndTopicMatches = allSentences.filter((item) => {
          const matchLevel =
            item.level.toUpperCase() === level.toUpperCase();

          const matchTopic =
            item.topic.trim().toLowerCase() === topic.trim().toLowerCase();

          return matchLevel && matchTopic;
        });

        const wordRegex = new RegExp(
          '(?:^|[^a-zA-Z0-9])' +
            this.escapeRegex(normalizedWord) +
            '(?:$|[^a-zA-Z0-9])',
          'i'
        );

        const matchingSentences = levelAndTopicMatches.filter((item) => {
          const directWordMatch =
            item.word.trim().toLowerCase() === normalizedWord;

          const sentenceContainsWord =
            wordRegex.test(item.sentence) ||
            item.sentence.toLowerCase().includes(normalizedWord);

          return directWordMatch || sentenceContainsWord;
        });

        if (matchingSentences.length === 0) {
          return null;
        }

        const unseenMatches = matchingSentences.filter(
          (item) => !excludedIds.includes(item.id)
        );

        const candidates =
          unseenMatches.length > 0 ? unseenMatches : matchingSentences;

        const randomIndex = Math.floor(Math.random() * candidates.length);

        return candidates[randomIndex];
      })
    );
  }

  /**
   * Cümleyi kelime parçalarına ayırır.
   */
  tokenize(sentence: string): SentenceToken[] {
    const rawTokens = sentence
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, ''))
      .filter((word) => word.length > 0);

    return rawTokens.map((text, index) => ({
      id: index,
      text,
      originalIndex: index,
      selected: false
    }));
  }

  /**
   * Kelimeleri Fisher-Yates algoritmasıyla karıştırır.
   */
  shuffleTokens(tokens: SentenceToken[]): SentenceToken[] {
    const copy = tokens.map((token) => ({
      ...token,
      selected: false
    }));

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

      isSameOrder = copy.every(
        (token, index) => token.originalIndex === index
      );
    }

    if (isSameOrder) {
      [copy[0], copy[1]] = [copy[1], copy[0]];
    }

    return copy;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
