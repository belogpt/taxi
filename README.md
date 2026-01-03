# Taxi Splitter

Приложение для справедливого распределения стоимости поездки на такси между участниками. UI построен на React + TypeScript + Tailwind, backend — на Node.js + Express, запуск производится через Docker Compose с фронтендом, бекендом и Nginx-прокси.

## Требования

- Docker
- Docker Compose

## Быстрый старт

```bash
docker compose up -d --build
```

После сборки:

- Фронтенд доступен на `http://localhost` (через Nginx).
- API доступно по пути `/api` (прокси на backend).

Остановка:

```bash
docker compose down
```

## Структура проекта

- `frontend/` — React + Vite + Tailwind UI.
- `backend/` — Express-приложение с эндпоинтом `POST /api/calculate` и `GET /api/health`.
- `nginx/` — конфигурация обратного прокси для фронтенда и API.
- `docker-compose.yml` — оркестрация сервисов.

## Запуск без Node.js на хосте

Все зависимости ставятся внутри контейнеров. Достаточно Docker и Docker Compose:

```bash
docker compose up -d --build
```

По умолчанию фронтенд в контейнере Vite Preview слушает `0.0.0.0:4173` и принимает заголовки `Host` для `progbel.ru`, `www.progbel.ru` и `localhost`. При необходимости измените список в `VITE_ALLOWED_HOSTS` для сервиса `frontend` в `docker-compose.yml`.

## API

`POST /api/calculate`

```json
{
  "total": 1500,
  "mode": "distance | individual_price | equal",
  "participants": [
    { "name": "Алиса", "value": 5 },
    { "name": "Боб", "value": 8 }
  ]
}
```

Ответ:

```json
{
  "total": 1500,
  "mode": "distance",
  "results": [
    { "name": "Алиса", "value": 5, "share": 0.3846, "pay": 577 },
    { "name": "Боб", "value": 8, "share": 0.6154, "pay": 923 }
  ],
  "sumPay": 1500
}
```

Округление происходит до целых рублей, разница от округления компенсируется у последнего участника.

`GET /api/health` возвращает `{ "status": "ok" }`.

## Привязка домена

1. Направьте DNS-записи A для `progbel.ru` и `www.progbel.ru` на IP вашего сервера.
2. Убедитесь, что порт 80 (и 443 для HTTPS) открыт.
3. Конфигурация Nginx уже содержит `server_name progbel.ru www.progbel.ru`; при необходимости измените под свой домен в `nginx/conf.d/default.conf`.

## Включение HTTPS (certbot)

На сервере с установленными Docker-контейнерами:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d progbel.ru -d www.progbel.ru
```

Certbot автоматически обновит конфигурацию Nginx для HTTPS. Для автоматического продления сертификатов certbot добавит системные таймеры/cron-задания.

## Самоподписанный сертификат

Для тестовой среды вы можете выпустить самоподписанный сертификат:

```bash
bash scripts/generate-self-signed-cert.sh example.com www.example.com
```

Скрипт создаст `nginx/certs/server.crt` и `nginx/certs/server.key`. Примонтируйте каталог `nginx/certs` в контейнер с Nginx (например, `./nginx/certs:/etc/nginx/certs:ro`) и укажите эти файлы в конфигурации Nginx (`ssl_certificate` и `ssl_certificate_key`).
