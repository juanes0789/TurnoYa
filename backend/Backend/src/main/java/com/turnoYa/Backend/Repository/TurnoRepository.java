package com.turnoYa.Backend.Repository;

import com.turnoYa.Backend.Entity.EstadoTurno;
import com.turnoYa.Backend.Entity.Turno;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TurnoRepository extends JpaRepository<Turno, Long> {

    Optional<Turno> findFirstByEstadoOrderByHoraLlegadaAscIdAsc(EstadoTurno estado);

    List<Turno> findByEstadoOrderByHoraLlegadaAscIdAsc(EstadoTurno estado);

    List<Turno> findByEstadoAndHoraLlamadoIsNotNull(EstadoTurno estado);

    Optional<Turno> findTopByOrderByIdDesc();
}

