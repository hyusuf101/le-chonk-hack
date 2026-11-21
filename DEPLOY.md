# Deploying VYBE: Railway (backend) + Vercel (frontend)

```
phone ──https──▶ Vercel (web/, static app)
   └────wss────▶ Railway (backend: /ws, speech, ranking, announcer, /img, /audio)
```

Both auto-deploy on every push to `main` once set up. **Do the backend first**: Vercel needs its URL.

## 1. Backend on Railway (person B)

1. railway.app → **New Project → Deploy from GitHub repo** → pick this repo.
2. Service **Settings**:
   - **Root Directory**: the backend folder (e.g. `server`).
   - **Start command**: whatever runs the server, listening on `0.0.0.0:$PORT`
     (e.g. `uvicorn app:app --host 0.0.0.0 --port $PORT`, or `node index.js` reading `process.env.PORT`).
3. **Variables**: add the backend's secrets (e.g. `MISTRAL_API_KEY`). Never commit them.
4. **Networking → Generate Domain**. You get something like `vybe-server-production.up.railway.app`.
   The WebSocket is then **`wss://vybe-server-production.up.railway.app/ws`**.
5. Backend must:
   - serve the WebSocket at **`/ws`** (any `Origin`: the app runs on a `*.vercel.app` domain);
   - serve photos/audio (`/img/...`, `/audio/...`) with `Access-Control-Allow-Origin: *`.
     Relative links like `/audio/x.pcm` are fine: the app resolves them against the backend's address;
   - keep sending a `board` at least every ~30 s (keeps the connection alive through proxies).

Check: open `https://<railway-domain>/` in a browser; the backend should answer (any page/404 is fine, as
long as it's not a Railway error page).

## 2. Frontend on Vercel (you)

1. vercel.com → **Add New → Project** → import this repo.
2. **Root Directory**: `web`. Framework preset **Vite** is detected (build `npm run build`, output `dist`).
3. **Environment Variables** (Production *and* Preview):
   `VITE_WS_URL` = `wss://<railway-domain>/ws`
4. **Deploy**. You get `https://<project>.vercel.app`.

After that, every push to `main` redeploys automatically. If you change `VITE_WS_URL`, hit **Redeploy**: it's
baked in at build time.

## 3. Try it

- Phone: open `https://<project>.vercel.app/?reset`. HTTPS means the mic works. Open it in Safari/Chrome,
  not inside another app's built-in browser.
- Demo safety net: `https://<project>.vercel.app/?mock` runs entirely in the browser if the backend is down.

## Local development (unchanged)

```bash
cd web && npm install
VYBE_SERVER=http://localhost:8000 npm run dev   # proxies /ws to a local backend
```

Phone testing against a local setup: `cloudflared tunnel --url http://localhost:5173` and open the URL it prints.

## If something's off

| Symptom | Likely cause |
|---|---|
| "Reconnecting…" pill never goes away | `VITE_WS_URL` wrong/missing (redeploy after fixing), backend not on `/ws`, or backend crashed: check Railway logs |
| Works on laptop, not phone | Using `ws://` instead of `wss://`, or opened in an in-app browser |
| Photos or announcer audio missing | Backend files lack `Access-Control-Allow-Origin`, or the URL is wrong. Photos fall back to the poster style |
| Mic says it's off | The phone blocked it for the site: allow it in browser settings, or use typing |
