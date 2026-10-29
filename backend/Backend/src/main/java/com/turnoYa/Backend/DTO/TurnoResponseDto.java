package com.turnoYa.Backend.DTO;

import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record TurnoResponseDto(
        Long id,
        Integer numero,
        LocalDateTime horaSolicitud,
        LocalDateTime horaAtencion,
        String estado
) {
}

