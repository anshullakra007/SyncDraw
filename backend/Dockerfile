FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY . .
RUN ./gradlew bootJar --no-daemon
# This command finds the jar file automatically, no matter what it is named
ENTRYPOINT ["sh", "-c", "java -jar build/libs/*.jar"]