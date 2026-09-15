# yorawealth

## Local development

- **Backend:** `cd backend && source venv/bin/activate && uvicorn app.main:app --port 8002 --reload`
- **Frontend:** `cd frontend && npm run dev` → http://localhost:5174

## Docker (production-style)

Stack under `docker/`: FastAPI backend + nginx SPA. MySQL is **external** (not in Compose). App is published on host port **8000**.

```bash
cd docker
cp .env.example .env   # set DB_*, SECRET_KEY, CORS_ORIGINS
docker compose up --build -d
```

Open http://localhost:8000

- Change the published port with `YORAWEALTH_PORT` in `docker/.env`
- If MySQL runs on the Docker host, keep `DB_HOST=host.docker.internal`
- Uploads persist in the `uploads_data` volume
- Apache in front of Docker: see [`docker/apache-wealth.yoratech.com.conf`](docker/apache-wealth.yoratech.com.conf) (proxies `wealth.yoratech.com` → `192.168.0.23:8000`)
- Set `CORS_ORIGINS` in `docker/.env` to include `http://wealth.yoratech.com` / `https://wealth.yoratech.com`
