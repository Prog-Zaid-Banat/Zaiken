# Zaiken AI Server (strong coach proxy)

API keys stay **only** on this server. The desktop app never receives your Groq/OpenAI key.

## Setup

```bash
cd server
cp .env.example .env
# edit .env → AI_API_KEY + ZAIKEN_APP_SECRET
npm start
```

## Desktop app

In project root `ai.config.json`:

```json
{
  "proxyUrl": "https://your-server.example.com",
  "appSecret": "same-secret-as-server"
}
```

No `apiKey` field needed on the client.

## Endpoints

- `GET /health`
- `POST /v1/coach` `{ message, gameName, stats }`
- `POST /v1/daily-report` `{ gameName }`

Auth: `Authorization: Bearer <ZAIKEN_APP_SECRET>`

## Deploy tips

- Use HTTPS (Caddy / Nginx / Cloudflare)
- Strong random `ZAIKEN_APP_SECRET`
- Keep `.env` off git
- For maximum answer quality set `AI_PROVIDER=openai` or `anthropic` with a strong model
