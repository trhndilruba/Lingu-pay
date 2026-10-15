
import {
  Component,
  ChangeDetectorRef,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';

import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { auth, db } from '../../core/firebase';

interface GameSession {
  id: string;
  gameType: string;
  score: number;
  correctAnswers: number;
  durationSeconds: number;
  playedAt: Date | null;
  totalQuestions?: number;
  level?: string;
  topic?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private unsubscribeAuth: Unsubscribe | null = null;

  displayName = 'Kullanıcı';
  email = '';
  totalXp = 0;
  level = 1;

  sessions: GameSession[] = [];

  isLoading = true;
  errorMessage = '';

  constructor() {
    this.unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        this.isLoading = true;
        this.errorMessage = '';

        if (!user) {
          this.displayName = 'Kullanıcı';
          this.email = '';
          this.sessions = [];
          this.totalXp = 0;
          this.level = 1;
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        this.email = user.email ?? '';
        this.displayName =
          user.displayName ||
          user.email?.split('@')[0] ||
          'Kullanıcı';

        try {
          const profileRef = doc(db, 'users', user.uid);
          const profileSnapshot = await getDoc(profileRef);

          if (profileSnapshot.exists()) {
            const profile = profileSnapshot.data();

            this.displayName =
              profile['displayName'] || this.displayName;

            this.totalXp = Number(profile['totalXp'] ?? 0);
            this.level = Number(profile['level'] ?? 1);
          }

          const sessionsRef = collection(
            db,
            'users',
            user.uid,
            'gameSessions'
          );

          const sessionsQuery = query(
            sessionsRef,
            orderBy('playedAt', 'desc')
          );

          const sessionsSnapshot = await getDocs(sessionsQuery);

          this.sessions = sessionsSnapshot.docs.map((item) => {
            const data = item.data();

            const playedAt = data['playedAt'];

            return {
              id: item.id,
              gameType: data['gameType'] ?? 'unknown',
              score: Number(data['score'] ?? 0),
              correctAnswers: Number(
                data['correctAnswers'] ?? 0
              ),
              durationSeconds: Number(
                data['durationSeconds'] ?? 0
              ),
              playedAt:
                playedAt instanceof Timestamp
                  ? playedAt.toDate()
                  : null,
              totalQuestions: data['totalQuestions'],
              level: data['level'],
              topic: data['topic']
            };
          });
        } catch (error) {
          console.error('Profil verileri yüklenemedi:', error);
          this.errorMessage =
            'Profil bilgileri yüklenemedi. Lütfen tekrar dene.';
        } finally {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      }
    );
  }

  get totalGames(): number {
    return this.sessions.length;
  }

  get totalCorrectAnswers(): number {
    return this.sessions.reduce(
      (total, session) => total + session.correctAnswers,
      0
    );
  }

  getGameName(gameType: string): string {
    switch (gameType) {
      case 'good-words':
        return 'Good Words';
      case 'sentence-scramble':
        return 'Sentence Scramble';
      default:
        return 'Oyun';
    }
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes} dk ${remainingSeconds} sn`;
  }

  ngOnDestroy(): void {
    this.unsubscribeAuth?.();
  }
}
