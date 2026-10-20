FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/agora .

FROM alpine:3.21

RUN addgroup -S agora && adduser -S -G agora -u 10001 agora \
    && apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/agora /app/agora
RUN mkdir -p /app/data/uploads && chown -R agora:agora /app/data
USER agora
EXPOSE 8090
ENV PORT=8090 UPLOAD_DIR=/app/data/uploads
ENTRYPOINT ["/app/agora"]
