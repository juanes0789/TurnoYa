package com.turnoYa.Backend.DTO;

import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record TurnoResponseDto(
        Long id,
        String numero,
        LocalDateTime horaLlegada,
        LocalDateTime horaLlamado,
        String estado
) {
}

