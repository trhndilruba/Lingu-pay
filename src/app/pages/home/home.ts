
import { Component, ChangeDetectorRef, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { onAuthStateChanged, signOut, Unsubscribe } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../../core/firebase';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private unsubscribeAuth: Unsubscribe;

  isLoggedIn = false;
  isLoadingStats = false;
  displayName = '';
  totalXp = 0;
  level = 1;
  totalGames = 0;

  constructor() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      this.isLoggedIn = !!user;
      this.displayName =
        user?.displayName ||
        user?.email?.split('@')[0] ||
        '';

      if (!user) {
        this.totalXp = 0;
        this.level = 1;
        this.totalGames = 0;
        this.cdr.markForCheck();
        return;
      }

      this.isLoadingStats = true;
      this.cdr.markForCheck();

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
          db, 'users', user.uid, 'gameSessions'
        );
        const sessionsSnapshot = await getDocs(sessionsRef);
        this.totalGames = sessionsSnapshot.size;
      } catch (error) {
        console.error('Ana sayfa bilgileri yüklenemedi:', error);
      } finally {
        this.isLoadingStats = false;
        this.cdr.markForCheck();
      }
    });
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Çıkış yapılamadı:', error);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeAuth();
  }
}
