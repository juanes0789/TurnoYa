import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'turno' },
  {
    path: 'turno',
    title: 'Pedir turno · TurnoYa',
    loadComponent: () => import('./features/turno/pedir-turno').then((m) => m.PedirTurno),
  },
  {
    path: 'asesor',
    title: 'Asesor · TurnoYa',
    loadComponent: () => import('./features/asesor/panel-asesor').then((m) => m.PanelAsesor),
  },
  { path: '**', redirectTo: 'turno' },
];
