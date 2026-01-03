FROM alpine:latest

ENV TZ=Asia/Teheran
RUN apk add --no-cache ca-certificates bash curl

# نصب هسته اصلی برای اجرای پروتکل
RUN curl -L -H "Cache-Control: no-cache" -o /v2ray.zip https://github.com/v2fly/v2ray-core/releases/latest/download/v2ray-linux-64.zip && \
    unzip /v2ray.zip && \
    chmod +x /v2ray

COPY config.json /config.json

CMD /v2ray run -c /config.json
