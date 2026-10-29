package com.turnoYa.Backend.Service;

import com.turnoYa.Backend.Entity.EstadoTurno;
import com.turnoYa.Backend.Entity.Turno;
import com.turnoYa.Backend.Exception.NoHayTurnosEnEsperaException;
import com.turnoYa.Backend.Exception.TurnoNoEncontradoException;
import com.turnoYa.Backend.Exception.TurnoNoPendienteException;
import com.turnoYa.Backend.Repository.TurnoRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TurnoServiceImpl implements TurnoService {

    private final TurnoRepository turnoRepository;

    public TurnoServiceImpl(TurnoRepository turnoRepository) {
        this.turnoRepository = turnoRepository;
    }

    @Override
    @Transactional
    public synchronized Turno crearTurno() {
        int siguienteSecuencia = turnoRepository.findTopByOrderByNumeroDesc()
                .map(turno -> turno.getNumero() + 1)
                .orElse(1);

        Turno nuevoTurno = Turno.builder()
                .numero(siguienteSecuencia)
                .horaSolicitud(LocalDateTime.now())
                .estado(EstadoTurno.PENDIENTE)
                .build();

        return turnoRepository.save(nuevoTurno);
    }

    @Override
    @Transactional
    public Turno llamarSiguienteTurno() {
        Turno siguienteTurno = turnoRepository.findFirstByEstadoOrderByHoraSolicitudAscNumeroAsc(EstadoTurno.PENDIENTE)
                .orElseThrow(() -> new NoHayTurnosEnEsperaException("No hay turnos en espera"));

        siguienteTurno.setEstado(EstadoTurno.ATENDIDO);
        siguienteTurno.setHoraAtencion(LocalDateTime.now());

        return turnoRepository.save(siguienteTurno);
    }

    @Override
    @Transactional
    public Turno cancelarTurno(Integer numero) {
        Turno turno = turnoRepository.findByNumero(numero)
                .orElseThrow(() -> new TurnoNoEncontradoException(numero));

        if (turno.getEstado() != EstadoTurno.PENDIENTE) {
            throw new TurnoNoPendienteException(numero);
        }

        turno.setEstado(EstadoTurno.CANCELADO);
        return turnoRepository.save(turno);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Turno> obtenerPorNumero(Integer numero) {
        return turnoRepository.findByNumero(numero);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Turno> obtenerTurnoActual() {
        return turnoRepository.findTopByEstadoOrderByHoraAtencionDescNumeroDesc(EstadoTurno.ATENDIDO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Turno> obtenerTurnosEnEspera() {
        return turnoRepository.findByEstadoOrderByHoraSolicitudAscNumeroAsc(EstadoTurno.PENDIENTE);
    }

    @Override
    @Transactional(readOnly = true)
    public double calcularEsperaPromedioEnMinutos() {
        List<Turno> turnosLlamados = turnoRepository.findByEstadoAndHoraAtencionIsNotNull(EstadoTurno.ATENDIDO);

        if (turnosLlamados.isEmpty()) {
            return 0.0;
        }

        double minutosPromedio = turnosLlamados.stream()
                .mapToLong(turno -> Duration.between(turno.getHoraSolicitud(), turno.getHoraAtencion()).toMillis())
                .average()
                .orElse(0.0) / 60000.0;

        return Math.round(minutosPromedio * 10.0) / 10.0;
    }
}

