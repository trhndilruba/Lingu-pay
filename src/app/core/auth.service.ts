// src/app/core/auth.service.ts

import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { Observable } from 'rxjs';

import { auth } from './firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly user$: Observable<User | null> = new Observable(
    (subscriber) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => subscriber.next(user),
        (error) => subscriber.error(error)
      );

      return unsubscribe;
    }
  );

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
  }

  logout() {
    return signOut(auth);
  }
}