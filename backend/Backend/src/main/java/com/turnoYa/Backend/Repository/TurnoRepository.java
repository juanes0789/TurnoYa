package com.turnoYa.Backend.Repository;

import com.turnoYa.Backend.Entity.EstadoTurno;
import com.turnoYa.Backend.Entity.Turno;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface TurnoRepository extends JpaRepository<Turno, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Turno> findFirstByEstadoOrderByHoraSolicitudAscNumeroAsc(EstadoTurno estado);

    List<Turno> findByEstadoOrderByHoraSolicitudAscNumeroAsc(EstadoTurno estado);

    List<Turno> findByEstadoAndHoraAtencionIsNotNull(EstadoTurno estado);

    Optional<Turno> findTopByOrderByNumeroDesc();

    Optional<Turno> findByNumero(Integer numero);

    Optional<Turno> findTopByEstadoOrderByHoraAtencionDescNumeroDesc(EstadoTurno estado);

    boolean existsByNumero(Integer numero);
}

