
import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';

import { auth, db } from './firebase';

export type GameType = 'good-words' | 'sentence-scramble';

export interface GameSessionResult {
  gameType: GameType;
  score: number;
  correctAnswers: number;
  durationSeconds: number;
  totalQuestions?: number;
  completedQuestions?: number;
  level?: string;
  topic?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameSessionService {
  async saveGameResult(
    result: GameSessionResult
  ): Promise<string> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        'AUTH_REQUIRED: Oyun sonucunu kaydetmek için giriş yapmalısın.'
      );
    }

    const sessionsRef = collection(
      db,
      'users',
      user.uid,
      'gameSessions'
    );

    const sessionDocument = await addDoc(sessionsRef, {
      userId: user.uid,
      ...result,
      playedAt: serverTimestamp()
    });

    return sessionDocument.id;
  }
}
