
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { UserProfileService } from '../../core/user-profile.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private router: Router
  ) {}

  async register(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';

    if (!this.name.trim()) {
      this.errorMessage = 'Lütfen adını gir.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Şifre en az 6 karakter olmalı.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Şifreler birbiriyle eşleşmiyor.';
      return;
    }

    this.loading = true;

    try {
      const credential = await this.authService.register(
        this.email,
        this.password
      );

      await this.userProfileService.ensureProfile(
        credential.user.uid,
        credential.user.email ?? this.email.trim(),
        this.name.trim()
      );

      await this.router.navigate(['/']);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;

      switch (code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'Bu e-posta adresi zaten kayıtlı.';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'Geçerli bir e-posta adresi gir.';
          break;
        case 'auth/weak-password':
          this.errorMessage = 'Daha güçlü bir şifre seç.';
          break;
        case 'auth/operation-not-allowed':
          this.errorMessage =
            'Firebase Console üzerinden Email/Password girişini etkinleştir.';
          break;
        case 'permission-denied':
          this.errorMessage =
            'Profil oluşturulamadı. Firestore güvenlik kurallarını kontrol et.';
          break;
        default:
          this.errorMessage =
            'Kayıt işlemi sırasında hata oluştu. Tekrar dene.';
      }
    } finally {
      this.loading = false;
    }
  }
}
