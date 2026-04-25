# === Stage 1: Builder ===
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml first for better layer caching
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN ./mvnw package -DskipTests

# === Stage 2: Runtime ===
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the jar file
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# Run directly - no layered extraction needed
ENTRYPOINT ["java", "-jar", "app.jar"]
