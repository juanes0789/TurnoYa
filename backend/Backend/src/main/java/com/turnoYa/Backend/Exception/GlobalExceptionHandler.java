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
}

