FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY . .
RUN ./gradlew bootJar --no-daemon
ENTRYPOINT ["java", "-jar", "build/libs/sync_draw_backend-0.0.1-SNAPSHOT.jar"]