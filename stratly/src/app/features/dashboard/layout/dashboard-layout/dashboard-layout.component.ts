import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideLayoutDashboard, lucideSparkles, lucideYoutube, lucideLogOut, lucideMenu, lucideTarget } from '@ng-icons/lucide';
import { NicheDetectorComponent } from '../../../../shared/components/niche-detector/niche-detector.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NgIconComponent, NicheDetectorComponent],
  providers: [
    provideIcons({ lucideLayoutDashboard, lucideSparkles, lucideYoutube, lucideLogOut, lucideMenu, lucideTarget })
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent {
  sidebarOpen = true;
  nicheDetectorOpen = false;

  navItems = [
    { label: 'Vue d\'ensemble', path: '/dashboard', icon: 'lucideLayoutDashboard', exact: true },
    { label: 'AI Insights', path: '/dashboard/ai-insights', icon: 'lucideSparkles', exact: false },
    { label: 'Connecter YouTube', path: '/dashboard/connect', icon: 'lucideYoutube', exact: false },
  ];

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) { }

  async handleSignOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleNicheDetector() {
    this.nicheDetectorOpen = !this.nicheDetectorOpen;
  }
}
