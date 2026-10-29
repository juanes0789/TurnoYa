import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-pedir-turno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>Pedir turno</h1>`,
})
export class PedirTurno {}
