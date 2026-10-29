package com.turnoYa.Backend.Service;

import com.turnoYa.Backend.Entity.Turno;
import java.util.List;
import java.util.Optional;

public interface TurnoService {

    Turno crearTurno();

    Turno llamarSiguienteTurno();

    Turno cancelarTurno(Integer numero);

    Optional<Turno> obtenerPorNumero(Integer numero);

    Optional<Turno> obtenerTurnoActual();

    List<Turno> obtenerTurnosEnEspera();

    double calcularEsperaPromedioEnMinutos();
}

