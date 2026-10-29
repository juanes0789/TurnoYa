package com.turnoYa.Backend.Exception;

public class TurnoNoEncontradoException extends RuntimeException {

    public TurnoNoEncontradoException(Integer numero) {
        super("No existe el turno " + numero);
    }
}
