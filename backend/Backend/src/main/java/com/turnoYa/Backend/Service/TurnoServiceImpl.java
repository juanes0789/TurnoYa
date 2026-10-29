package com.turnoYa.Backend.Service;

import com.turnoYa.Backend.Entity.EstadoTurno;
import com.turnoYa.Backend.Entity.Turno;
import com.turnoYa.Backend.Exception.NoHayTurnosEnEsperaException;
import com.turnoYa.Backend.Repository.TurnoRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TurnoServiceImpl implements TurnoService {

    private static final String TURNO_PREFIX = "T-";
    private final TurnoRepository turnoRepository;

    public TurnoServiceImpl(TurnoRepository turnoRepository) {
        this.turnoRepository = turnoRepository;
    }

    @Override
    @Transactional
    public synchronized Turno crearTurno() {
        int siguienteSecuencia = turnoRepository.findTopByOrderByIdDesc()
                .map(turno -> extraerSecuencia(turno.getNumero()) + 1)
                .orElse(1);

        Turno nuevoTurno = Turno.builder()
                .numero(formatearNumeroTurno(siguienteSecuencia))
                .horaLlegada(LocalDateTime.now())
                .estado(EstadoTurno.EN_ESPERA)
                .build();

        return turnoRepository.save(nuevoTurno);
    }

    @Override
    @Transactional
    public Turno llamarSiguienteTurno() {
        Turno siguienteTurno = turnoRepository.findFirstByEstadoOrderByHoraLlegadaAscIdAsc(EstadoTurno.EN_ESPERA)
                .orElseThrow(() -> new NoHayTurnosEnEsperaException("No hay turnos en espera"));

        siguienteTurno.setEstado(EstadoTurno.LLAMADO);
        siguienteTurno.setHoraLlamado(LocalDateTime.now());

        return turnoRepository.save(siguienteTurno);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Turno> obtenerTurnosEnEspera() {
        return turnoRepository.findByEstadoOrderByHoraLlegadaAscIdAsc(EstadoTurno.EN_ESPERA);
    }

    @Override
    @Transactional(readOnly = true)
    public double calcularEsperaPromedioEnMinutos() {
        List<Turno> turnosLlamados = turnoRepository.findByEstadoAndHoraLlamadoIsNotNull(EstadoTurno.LLAMADO);

        if (turnosLlamados.isEmpty()) {
            return 0.0;
        }

        double minutosPromedio = turnosLlamados.stream()
                .mapToLong(turno -> Duration.between(turno.getHoraLlegada(), turno.getHoraLlamado()).toMillis())
                .average()
                .orElse(0.0) / 60000.0;

        return Math.round(minutosPromedio * 100.0) / 100.0;
    }

    private int extraerSecuencia(String numeroTurno) {
        if (numeroTurno == null || !numeroTurno.startsWith(TURNO_PREFIX)) {
            throw new IllegalStateException("Formato de numero de turno invalido: " + numeroTurno);
        }

        return Integer.parseInt(numeroTurno.substring(TURNO_PREFIX.length()));
    }

    private String formatearNumeroTurno(int secuencia) {
        return String.format("%s%03d", TURNO_PREFIX, secuencia);
    }
}

