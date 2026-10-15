
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home').then(m => m.Home),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register').then(m => m.Register)
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile').then(m => m.Profile)
  },
  {
    path: 'good-words',
    loadComponent: () =>
      import('./games/good-words/good-words')
        .then(m => m.GoodWords)
  },
  {
    path: 'sentence-scramble',
    loadComponent: () =>
      import('./games/sentence-scramble/sentence-scramble')
        .then(m => m.SentenceScramble)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
