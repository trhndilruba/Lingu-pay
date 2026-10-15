import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAxI4vNvKuPkMTrrs0etE5cOwab6zL0hDk',
  authDomain: 'linguaplay-97cab.firebaseapp.com',
  projectId: 'linguaplay-97cab',
  storageBucket: 'linguaplay-97cab.firebasestorage.app',
  messagingSenderId: '982975045860',
  appId: '1:982975045860:web:7282fe3f6a2a8a1b7fccf1'
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);