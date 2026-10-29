export type EstadoTurno = 'PENDIENTE' | 'ATENDIDO' | 'CANCELADO';

/** Un turno tal como lo expone el contrato (docs/api.md). Fechas en ISO local sin zona. */
export interface Turno {
  numero: number;
  horaSolicitud: string;
  horaAtencion: string | null;
  estado: EstadoTurno;
}

export interface EsperaPromedio {
  minutos: number;
}

/** Error de la API con el status HTTP (0 = sin conexión) y el mensaje para mostrar al usuario. */
export class TurnoError extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'TurnoError';
  }
}
