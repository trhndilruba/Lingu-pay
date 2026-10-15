
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserProfileService } from '../../core/user-profile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private router: Router
  ) {}

  async login(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;

    try {
  const credential = await this.authService.login(
    this.email,
    this.password
  );

  const user = credential.user;
  const fallbackName = user.email?.split('@')[0] ?? 'Öğrenci';

  await this.userProfileService.ensureProfile(
    user.uid,
    user.email ?? this.email.trim(),
    user.displayName ?? fallbackName
  );

  await this.router.navigate(['/']);
} catch (error: unknown) {
  const code = (error as { code?: string })?.code;

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      this.errorMessage = 'E-posta veya şifre hatalı.';
      break;
    case 'auth/invalid-email':
      this.errorMessage = 'Geçerli bir e-posta adresi gir.';
      break;
    case 'auth/too-many-requests':
      this.errorMessage =
        'Çok fazla deneme yapıldı. Bir süre sonra tekrar dene.';
      break;
    default:
      this.errorMessage =
        'Giriş sırasında bir hata oluştu. Lütfen tekrar dene.';
  }
    } finally {
    this.loading = false;
    }
  }
}
