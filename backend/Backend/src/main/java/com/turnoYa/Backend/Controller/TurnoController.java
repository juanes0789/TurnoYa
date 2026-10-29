package com.turnoYa.Backend.Controller;

import com.turnoYa.Backend.DTO.EsperaPromedioResponseDto;
import com.turnoYa.Backend.DTO.ErrorResponseDto;
import com.turnoYa.Backend.DTO.TurnoResponseDto;
import com.turnoYa.Backend.Mapper.TurnoMapper;
import com.turnoYa.Backend.Service.TurnoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/turnos")
@Tag(name = "Turnos", description = "Gestión de la fila virtual de turnos")
public class TurnoController {

    private final TurnoService turnoService;

    public TurnoController(TurnoService turnoService) {
        this.turnoService = turnoService;
    }

    @PostMapping
    @Operation(
            summary = "Crear turno",
            description = "Crea un turno PENDIENTE con el número máximo existente más uno."
    )
    @ApiResponse(
            responseCode = "201",
            description = "Turno creado",
            content = @Content(schema = @Schema(implementation = TurnoResponseDto.class))
    )
    public ResponseEntity<TurnoResponseDto> crearTurno() {
        TurnoResponseDto turnoCreado = TurnoMapper.toDto(turnoService.crearTurno());
        return ResponseEntity.status(HttpStatus.CREATED).body(turnoCreado);
    }

    @PostMapping("/siguiente")
    @Operation(
            summary = "Atender siguiente turno",
            description = "Atiende el turno PENDIENTE con menor horaSolicitud; en empate usa el menor número."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Turno atendido",
                    content = @Content(schema = @Schema(implementation = TurnoResponseDto.class))
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "No hay turnos pendientes",
                    content = @Content(schema = @Schema(implementation = ErrorResponseDto.class))
            )
    })
    public ResponseEntity<TurnoResponseDto> llamarSiguienteTurno() {
        TurnoResponseDto turnoLlamado = TurnoMapper.toDto(turnoService.llamarSiguienteTurno());
        return ResponseEntity.ok(turnoLlamado);
    }

    @PatchMapping("/{numero:\\d+}/cancelar")
    @Operation(
            summary = "Cancelar turno",
            description = "Cancela un turno únicamente cuando se encuentra PENDIENTE."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Turno cancelado",
                    content = @Content(schema = @Schema(implementation = TurnoResponseDto.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "El número no existe",
                    content = @Content(schema = @Schema(implementation = ErrorResponseDto.class))
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "El turno no está pendiente",
                    content = @Content(schema = @Schema(implementation = ErrorResponseDto.class))
            )
    })
    public ResponseEntity<TurnoResponseDto> cancelarTurno(
            @Parameter(description = "Número entero del turno", example = "7") @PathVariable Integer numero) {
        return ResponseEntity.ok(TurnoMapper.toDto(turnoService.cancelarTurno(numero)));
    }

    @GetMapping("/en-espera")
    @Operation(
            summary = "Listar turnos en espera",
            description = "Devuelve los turnos PENDIENTE ordenados por horaSolicitud y número."
    )
    @ApiResponse(
            responseCode = "200",
            description = "Fila de turnos pendientes",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = TurnoResponseDto.class)))
    )
    public ResponseEntity<List<TurnoResponseDto>> obtenerTurnosEnEspera() {
        List<TurnoResponseDto> turnos = turnoService.obtenerTurnosEnEspera()
                .stream()
                .map(TurnoMapper::toDto)
                .toList();

        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/espera-promedio")
    @Operation(
            summary = "Consultar espera promedio",
            description = "Calcula el promedio en minutos de los turnos ATENDIDO; sin atendidos devuelve 0."
    )
    @ApiResponse(
            responseCode = "200",
            description = "Promedio de espera",
            content = @Content(schema = @Schema(implementation = EsperaPromedioResponseDto.class))
    )
    public ResponseEntity<EsperaPromedioResponseDto> obtenerEsperaPromedio() {
        return ResponseEntity.ok(new EsperaPromedioResponseDto(turnoService.calcularEsperaPromedioEnMinutos()));
    }

    @GetMapping("/actual")
    @Operation(
            summary = "Consultar turno actual",
            description = "Devuelve el último turno atendido."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Último turno atendido",
                    content = @Content(schema = @Schema(implementation = TurnoResponseDto.class))
            ),
            @ApiResponse(responseCode = "204", description = "Aún no hay turnos atendidos")
    })
    public ResponseEntity<TurnoResponseDto> obtenerTurnoActual() {
        Optional<TurnoResponseDto> turnoActual = turnoService.obtenerTurnoActual().map(TurnoMapper::toDto);
        return turnoActual.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{numero:\\d+}")
    @Operation(
            summary = "Consultar turno por número",
            description = "Devuelve un turno sin importar si está PENDIENTE, ATENDIDO o CANCELADO."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Turno encontrado",
                    content = @Content(schema = @Schema(implementation = TurnoResponseDto.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "El número no existe",
                    content = @Content(schema = @Schema(implementation = ErrorResponseDto.class))
            )
    })
    public ResponseEntity<TurnoResponseDto> obtenerPorNumero(
            @Parameter(description = "Número entero del turno", example = "7") @PathVariable Integer numero) {
        return turnoService.obtenerPorNumero(numero)
                .map(TurnoMapper::toDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

