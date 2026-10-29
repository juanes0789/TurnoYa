package com.turnoYa.Backend.Exception;

import com.turnoYa.Backend.DTO.ErrorResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoHayTurnosEnEsperaException.class)
    public ResponseEntity<ErrorResponseDto> handleNoHayTurnosEnEspera(NoHayTurnosEnEsperaException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponseDto(ex.getMessage()));
    }

    @ExceptionHandler(TurnoNoEncontradoException.class)
    public ResponseEntity<ErrorResponseDto> handleTurnoNoEncontrado(TurnoNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto(ex.getMessage()));
    }

    @ExceptionHandler(TurnoNoPendienteException.class)
    public ResponseEntity<ErrorResponseDto> handleTurnoNoPendiente(TurnoNoPendienteException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponseDto(ex.getMessage()));
    }
}

