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

- По умолчанию Nginx внутри docker-проекта слушает 8080/8443 на хосте (чтобы не конфликтовать с системными сервисами). Меняются через переменные `NGINX_HTTP_PORT` и `NGINX_HTTPS_PORT`.
- Фронтенд доступен на `http://localhost:8080` (если переменные не переопределялись).
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

## Пример, если 443 уже занят (VPN/прочие сервисы)

Контейнер Nginx можно публиковать на другие порты, а внешний TLS/80 оставить на хостовом прокси:

1. Портами контейнера управляют переменные окружения:
   ```bash
   export NGINX_HTTP_PORT=8080
   export NGINX_HTTPS_PORT=8443  # можно пропустить, если HTTPS на хосте
   docker compose up -d --build
   ```
2. На хостовом Nginx (или другом фронт-прокси) настройте SNI для домена и проксируйте на контейнер:
   ```nginx
   server {
     listen 80;
     listen 443 ssl http2;
     server_name progbel.ru www.progbel.ru;
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     location / {
       proxy_pass http://127.0.0.1:8080;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
   Так другие службы на 443 (например, VLESS по IP) не мешают, а доменный трафик уходит в контейнер.

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
