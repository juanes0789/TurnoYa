FROM maven:3.9.11-eclipse-temurin-17 AS build

WORKDIR /app

COPY backend/Backend/pom.xml ./pom.xml
RUN mvn --batch-mode dependency:go-offline

COPY backend/Backend/src ./src
RUN mvn --batch-mode package -DskipTests

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar /app/app.jar
COPY data/turnos_hoy.xlsx /app/data/turnos_hoy.xlsx

ENV TURNOYA_DATA_FILE=/app/data/turnos_hoy.xlsx

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
