
import { Injectable } from '@angular/core';
import {
  collection,
  getDocs,
  orderBy,
  query
} from 'firebase/firestore';

import { db } from './firebase';

export interface WordItem {
  id: number;
  word: string;
}

export interface SentenceItem {
  id: number;
  word: string;
  level: string;
  topic: string;
  sentence: string;
  translation: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameContentService {

  async getWords(): Promise<WordItem[]> {
    const wordsRef = collection(db, 'words');
    const wordsQuery = query(wordsRef, orderBy('id', 'asc'));
    const snapshot = await getDocs(wordsQuery);

    return snapshot.docs.map(document => {
      const data = document.data();

      return {
        id: Number(data['id']),
        word: String(data['word'])
      };
    });
  }

  async getSentences(): Promise<SentenceItem[]> {
    const sentencesRef = collection(db, 'sentences');
    const sentencesQuery = query(
      sentencesRef,
      orderBy('id', 'asc')
    );

    const snapshot = await getDocs(sentencesQuery);

    return snapshot.docs.map(document => {
      const data = document.data();

      return {
        id: Number(data['id']),
        word: String(data['word']),
        level: String(data['level']),
        topic: String(data['topic']),
        sentence: String(data['sentence']),
        translation: String(data['translation'])
      };
    });
  }
}
