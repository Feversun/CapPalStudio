# CapPal Headless API (VPS + Tailscale)

This branch includes a headless API server that exposes CapPal Studio's generation workflow without the UI. It is designed for VPS use and is easiest to reach from mobile apps via Tailscale.

## Quick Start

1. Install dependencies:
   `npm install`
2. Start the API:
   `CAPPAL_API_HOST=0.0.0.0 CAPPAL_API_PORT=8787 CAPPAL_LOCAL_BASE_URL=http://localhost:8080 CAPPAL_LOCAL_STYLE=anthropic npm run api`
3. Health check (from a Tailscale-connected device):
   `curl http://<TAILSCALE_IP>:8787/health`

## Environment Variables

- `CAPPAL_API_HOST`: Bind host, default `0.0.0.0`
- `CAPPAL_API_PORT`: Bind port, default `8787`
- `CAPPAL_PROVIDER`: `local` or `cloud` (default `local`)
- `CAPPAL_LOCAL_BASE_URL`: Proxy base URL (default `http://localhost:8080`)
- `CAPPAL_LOCAL_STYLE`: `anthropic` or `gemini` (default `anthropic`)
- `CAPPAL_LOCAL_KEY`: Proxy API key (default set in code)

## Endpoints

- `GET /health`
- `POST /v1/analyze`
- `POST /v1/master`
- `POST /v1/sticker`
- `POST /v1/scene`
- `POST /v1/encyclopedia`

## Example Requests

### Health
```bash
curl http://<TAILSCALE_IP>:8787/health
```

### Generate Sticker
```bash
curl -X POST http://<TAILSCALE_IP>:8787/v1/sticker \
  -H "Content-Type: application/json" \
  -d '{
    "sourceBase64": "data:image/png;base64,REPLACE_WITH_BASE64",
    "subjectDescription": "A fluffy orange corgi with big eyes",
    "emotionOrAction": "Happy",
    "stylePrompt": "3D sticker, clean white background",
    "isSpriteSheet": false,
    "genConfig": {
      "temperature": 0.8,
      "topP": 0.9,
      "topK": 40,
      "seed": 123,
      "imageSize": "1K",
      "model": "gemini-3-pro-image"
    }
  }'
```

## Systemd Service (Recommended)

Create `/etc/systemd/system/cappal-api.service`:
```
[Unit]
Description=CapPal Headless API
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/CapPalStudio
ExecStart=/usr/bin/npm run api
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=CAPPAL_API_HOST=0.0.0.0
Environment=CAPPAL_API_PORT=8787
Environment=CAPPAL_LOCAL_BASE_URL=http://localhost:8080
Environment=CAPPAL_LOCAL_STYLE=anthropic

[Install]
WantedBy=multi-user.target
```

Enable it:
```bash
systemctl daemon-reload
systemctl enable --now cappal-api.service
systemctl status cappal-api.service --no-pager
```

## Tailscale Notes

This API is intended to be reached over your private Tailscale network. If you bind to `0.0.0.0`, avoid exposing the port publicly unless you add authentication.

## Logs

```bash
journalctl -u cappal-api.service -f
```
