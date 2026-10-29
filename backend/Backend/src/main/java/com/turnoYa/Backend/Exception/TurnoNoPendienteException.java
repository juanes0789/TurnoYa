package com.turnoYa.Backend.Exception;

public class TurnoNoPendienteException extends RuntimeException {

    public TurnoNoPendienteException(Integer numero) {
        super("El turno " + numero + " no está PENDIENTE");
    }
}
