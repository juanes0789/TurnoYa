package com.turnoYa.Backend.Loader;

import com.turnoYa.Backend.Entity.EstadoTurno;
import com.turnoYa.Backend.Entity.Turno;
import com.turnoYa.Backend.Repository.TurnoRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
public class TurnoExcelLoader {

    private static final Logger log = LoggerFactory.getLogger(TurnoExcelLoader.class);
    private static final DateTimeFormatter TIME_FORMATTER = new DateTimeFormatterBuilder()
            .appendPattern("H:mm")
            .optionalStart()
            .appendPattern(":ss")
            .optionalEnd()
            .toFormatter();

    private final TurnoRepository turnoRepository;
    private final String dataFile;

    public TurnoExcelLoader(
            TurnoRepository turnoRepository,
            @Value("${turnoya.data-file:../../data/turnos_hoy.xlsx}") String dataFile) {
        this.turnoRepository = turnoRepository;
        this.dataFile = dataFile;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void cargarAlIniciar() {
        Path path = resolverArchivo();
        if (path == null) {
            log.warn("No se encontró el archivo de turnos: {}. Se inicia sin carga inicial.", dataFile);
            return;
        }

        int cargados = 0;
        int rechazados = 0;
        Set<Integer> numerosVistos = new HashSet<>();

        try (InputStream input = Files.newInputStream(path);
                Workbook workbook = WorkbookFactory.create(input)) {
            Sheet sheet = workbook.getSheet("in");
            if (sheet == null) {
                throw new IllegalStateException("El archivo no contiene la hoja 'in'");
            }

            DataFormatter formatter = new DataFormatter();
            Map<String, Integer> columnas = leerCabeceras(sheet.getRow(sheet.getFirstRowNum()), formatter);
            LocalDate fecha = LocalDate.now();

            for (int index = sheet.getFirstRowNum() + 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                if (row == null || filaVacia(row, formatter)) {
                    continue;
                }

                Integer numero = leerEntero(row.getCell(columnas.get("numero")), formatter);
                if (numero == null) {
                    throw new IllegalArgumentException("Fila " + (index + 1) + ": numero vacío o inválido");
                }

                if (!numerosVistos.add(numero) || turnoRepository.existsByNumero(numero)) {
                    rechazados++;
                    log.warn("Fila {} rechazada: número duplicado {}", index + 1, numero);
                    continue;
                }

                LocalTime horaSolicitud = leerHora(row.getCell(columnas.get("hora_solicitud")), formatter);
                if (horaSolicitud == null) {
                    throw new IllegalArgumentException("Fila " + (index + 1) + ": hora_solicitud vacía o inválida");
                }

                EstadoTurno estado = leerEstado(row.getCell(columnas.get("estado")), formatter);
                LocalTime horaAtencion = leerHora(row.getCell(columnas.get("hora_atencion")), formatter);

                turnoRepository.save(Turno.builder()
                        .numero(numero)
                        .horaSolicitud(LocalDateTime.of(fecha, horaSolicitud))
                        .horaAtencion(horaAtencion == null ? null : LocalDateTime.of(fecha, horaAtencion))
                        .estado(estado)
                        .build());
                cargados++;
            }

            log.info("Carga de turnos finalizada. Cargados: {}, rechazados: {}", cargados, rechazados);
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo leer " + path, ex);
        }
    }

    private Path resolverArchivo() {
        Path configurado = Paths.get(dataFile);
        if (Files.exists(configurado)) {
            return configurado;
        }

        Path desdeRaiz = Paths.get("data", "turnos_hoy.xlsx");
        if (Files.exists(desdeRaiz)) {
            return desdeRaiz;
        }

        Path desdeModulo = Paths.get("..", "..", "data", "turnos_hoy.xlsx").normalize();
        return Files.exists(desdeModulo) ? desdeModulo : null;
    }

    private Map<String, Integer> leerCabeceras(Row row, DataFormatter formatter) {
        if (row == null) {
            throw new IllegalArgumentException("La hoja 'in' no tiene cabeceras");
        }

        Map<String, Integer> columnas = new HashMap<>();
        for (Cell cell : row) {
            columnas.put(formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT), cell.getColumnIndex());
        }

        for (String requerida : new String[]{"numero", "hora_solicitud", "hora_atencion", "estado"}) {
            if (!columnas.containsKey(requerida)) {
                throw new IllegalArgumentException("Falta la columna '" + requerida + "'");
            }
        }
        return columnas;
    }

    private boolean filaVacia(Row row, DataFormatter formatter) {
        for (Cell cell : row) {
            if (!formatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private Integer leerEntero(Cell cell, DataFormatter formatter) {
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            return (int) cell.getNumericCellValue();
        }
        return Integer.valueOf(formatter.formatCellValue(cell).trim());
    }

    private LocalTime leerHora(Cell cell, DataFormatter formatter) {
        if (cell == null || cell.getCellType() == CellType.BLANK
                || formatter.formatCellValue(cell).trim().isEmpty()) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC || DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalTime();
        }
        try {
            return LocalTime.parse(formatter.formatCellValue(cell).trim(), TIME_FORMATTER);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Hora inválida: " + formatter.formatCellValue(cell), ex);
        }
    }

    private EstadoTurno leerEstado(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            throw new IllegalArgumentException("Estado vacío");
        }
        try {
            return EstadoTurno.valueOf(formatter.formatCellValue(cell).trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Estado inválido: " + formatter.formatCellValue(cell), ex);
        }
    }
}
