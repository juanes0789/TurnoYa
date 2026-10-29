package com.turnoYa.Backend.Service;

import com.turnoYa.Backend.Entity.Turno;
import java.util.List;

public interface TurnoService {

    Turno crearTurno();

    Turno llamarSiguienteTurno();

    List<Turno> obtenerTurnosEnEspera();

    double calcularEsperaPromedioEnMinutos();
}

