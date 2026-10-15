
import { Injectable } from '@angular/core';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

import { db } from './firebase';

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  async ensureProfile(
    uid: string,
    email: string,
    displayName: string
  ): Promise<void> {
    const profileRef = doc(db, 'users', uid);
    const profileSnapshot = await getDoc(profileRef);

    if (profileSnapshot.exists()) {
      return;
    }

    await setDoc(profileRef, {
      uid,
      email,
      displayName,
      totalXp: 0,
      level: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}
