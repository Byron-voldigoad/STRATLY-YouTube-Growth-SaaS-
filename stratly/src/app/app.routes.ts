import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard],
    },
    {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent),
        canActivate: [guestGuard],
    },
    {
        path: 'auth/callback',
        loadComponent: () => import('./features/auth/callback/callback.component').then(m => m.CallbackComponent),
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/layout/dashboard-layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
        canActivate: [authGuard],
        children: [
            { path: '', loadComponent: () => import('./features/dashboard/overview/overview.component').then(m => m.OverviewComponent) },
            { path: 'ai-insights', loadComponent: () => import('./features/dashboard/ai-insights/ai-insights.component').then(m => m.AiInsightsComponent) },
            { path: 'connect', loadComponent: () => import('./features/dashboard/connect/connect.component').then(m => m.ConnectComponent) },
            { path: 'connect/callback', loadComponent: () => import('./features/dashboard/connect/callback/callback.component').then(m => m.CallbackComponent) },
        ],
    },
    { path: '**', redirectTo: '' },
];
