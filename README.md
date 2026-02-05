<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1V0Olahg69fSIPO0sEvDatQqFRatexf6f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Optional) Set the `GEMINI_API_KEY` in `.env.local` if you want Cloud mode
3. Start the headless API service:
   `CAPPAL_API_HOST=0.0.0.0 CAPPAL_API_PORT=8787 npm run api`
4. Run the app:
   `npm run dev`

## Headless API on VPS

See `DEPLOY_API.md` for the Tailscale-first VPS setup, environment variables, and systemd service.
