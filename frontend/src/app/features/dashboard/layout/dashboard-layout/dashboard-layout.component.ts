import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
} from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard,
  lucideSparkles,
  lucideYoutube,
  lucideLogOut,
  lucideMenu,
  lucideTarget,
  lucideZap,
} from '@ng-icons/lucide';
import { NicheDetectorComponent } from '../../../../shared/components/niche-detector/niche-detector.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIconComponent,
    NicheDetectorComponent,
  ],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideSparkles,
      lucideYoutube,
      lucideLogOut,
      lucideMenu,
      lucideTarget,
      lucideZap,
    }),
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = window.innerWidth >= 768;
  isMobile = window.innerWidth < 768;
  nicheDetectorOpen = false;

  navItems: NavItem[] = [
    {
      label: "Vue d'ensemble",
      path: '/dashboard',
      icon: 'lucideLayoutDashboard',
      exact: true,
    },
    {
      label: 'Prochaine Décision',
      path: '/dashboard/decision',
      icon: 'lucideZap',
      exact: false,
    },
    {
      label: 'Analyse IA',
      path: '/dashboard/ai-insights',
      icon: 'lucideSparkles',
      exact: false,
    },
    {
      label: 'Connecter YouTube',
      path: '/dashboard/connect',
      icon: 'lucideYoutube',
      exact: false,
    },
  ];

  constructor(
    private supabase: SupabaseService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  handleResize() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.sidebarOpen = false;
    } else {
      this.sidebarOpen = true;
    }
  }

  getPageTitle(): string {
    const path = this.router.url;
    if (path.startsWith('/dashboard/decision')) return 'Prochaine Décision';
    if (path.startsWith('/dashboard/overview')) return 'Tableau de bord';
    if (path.startsWith('/dashboard/ai-insights')) return 'Analyse IA';
    if (path.startsWith('/dashboard/connect')) return 'Connexion YouTube';
    if (path.startsWith('/dashboard/niche-detector')) return 'Niche Detector';
    return 'Tableau de bord';
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  async handleSignOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  toggleNicheDetector() {
    this.nicheDetectorOpen = !this.nicheDetectorOpen;
  }
}
