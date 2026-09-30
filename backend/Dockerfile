
# Stage 1: Build aplikasi Go
FROM golang:1.27-alpine AS builder

WORKDIR /app

# Dependensi sistem untuk build
RUN apk add --no-cache git ca-certificates

# Salin file module terlebih dahulu agar cache dependency efektif
COPY go.mod go.sum ./
RUN go mod download

# Salin seluruh source code
COPY . .

# Build binary server
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /app/carthage-server \
    ./cmd/server

# Stage 2: Runtime
FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S carthage \
    && adduser -S -G carthage carthage

COPY --from=builder /app/carthage-server /app/carthage-server

USER carthage

EXPOSE 8080

ENTRYPOINT ["/app/carthage-server"]