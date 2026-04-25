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

# Use Spring Boot layered jars for faster startup
COPY --from=builder /app/target/*.jar app.jar

# Extract layers for optimal Docker caching
RUN java -Djarmode=layertools -jar app.jar extract && \
    rm -rf app.jar

# Copy extracted layers
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./

ENV SPRING_BOOT_PRODUCT_NAME=application

EXPOSE 8080

# Use layered jar startup
ENTRYPOINT ["java", "-Djarmode=layertools", "org.springframework.boot.loader.launch.JarLauncher"]
