package com.turnoYa.Backend.Mapper;

import com.turnoYa.Backend.DTO.TurnoResponseDto;
import com.turnoYa.Backend.Entity.Turno;

public final class TurnoMapper {

    private TurnoMapper() {
    }

    public static TurnoResponseDto toDto(Turno turno) {
        return TurnoResponseDto.builder()
                .id(turno.getId())
                .numero(turno.getNumero())
                .horaSolicitud(turno.getHoraSolicitud())
                .horaAtencion(turno.getHoraAtencion())
                .estado(turno.getEstado().name())
                .build();
    }
}

