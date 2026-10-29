package com.turnoYa.Backend.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "turnos",
        uniqueConstraints = {
            @UniqueConstraint(name = "uk_turnos_numero", columnNames = "numero")
        }
)
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private Integer numero;

    @Column(nullable = false)
    private LocalDateTime horaSolicitud;

    @Column
    private LocalDateTime horaAtencion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoTurno estado;
}

