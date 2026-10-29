package com.turnoYa.Backend.Controller;

import com.turnoYa.Backend.DTO.EsperaPromedioResponseDto;
import com.turnoYa.Backend.DTO.TurnoResponseDto;
import com.turnoYa.Backend.Mapper.TurnoMapper;
import com.turnoYa.Backend.Service.TurnoService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/turnos")
public class TurnoController {

    private final TurnoService turnoService;

    public TurnoController(TurnoService turnoService) {
        this.turnoService = turnoService;
    }

    @PostMapping
    public ResponseEntity<TurnoResponseDto> crearTurno() {
        TurnoResponseDto turnoCreado = TurnoMapper.toDto(turnoService.crearTurno());
        return ResponseEntity.status(HttpStatus.CREATED).body(turnoCreado);
    }

    @PostMapping("/siguiente")
    public ResponseEntity<TurnoResponseDto> llamarSiguienteTurno() {
        TurnoResponseDto turnoLlamado = TurnoMapper.toDto(turnoService.llamarSiguienteTurno());
        return ResponseEntity.ok(turnoLlamado);
    }

    @GetMapping("/en-espera")
    public ResponseEntity<List<TurnoResponseDto>> obtenerTurnosEnEspera() {
        List<TurnoResponseDto> turnos = turnoService.obtenerTurnosEnEspera()
                .stream()
                .map(TurnoMapper::toDto)
                .toList();

        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/espera-promedio")
    public ResponseEntity<EsperaPromedioResponseDto> obtenerEsperaPromedio() {
        return ResponseEntity.ok(new EsperaPromedioResponseDto(turnoService.calcularEsperaPromedioEnMinutos()));
    }
}

