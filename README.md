# FRIDAY AI Assistant 3.0

A bilingual (English/Tamil) AI chat website with browser voice input and spoken replies. The AI API key is read only by the Node.js server.

## Requirements
- Node.js 20+
- An OpenAI API key with API billing/access enabled

## Run locally
1. Install Node.js 20 or newer.
2. In this folder run `npm install`.
3. Set `OPENAI_API_KEY` as an environment variable in your terminal (do not commit it).
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Deploy on Render
The earlier FRIDAY 2.0 service is a **Static Site**. This 3.0 version includes a backend, so deploy it as a **Web Service**:
1. Replace the repository files with the contents of this ZIP. Keep `server.js`, `package.json`, `public/`, `.gitignore`, and `README.md` at the repository root.
2. In Render choose **New + → Web Service** and connect the `friday-ai-assistant` repository.
3. Runtime: Node. Branch: `main`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add an Environment Variable named `OPENAI_API_KEY` with your secret API key. Optionally add `OPENAI_MODEL` (default `gpt-5.5`).
7. Deploy. Open the new Web Service URL. Keep the old Static Site until the new service works.

## Security and limitations
- Never place the API key in `public/`, browser JavaScript, GitHub, or chat messages. Add it only in Render's Environment settings.
- The server has a simple per-IP request limit and limits message size/history. For a public production service, add proper authentication, persistent abuse controls, monitoring, and cost limits.
- This starter does not implement user accounts, Windows/PC control, file access, WhatsApp, email sending, or smart-home actions. Those need separate secure integrations and explicit permissions.
- Browser speech recognition depends on browser support and microphone permission. Tamil speech recognition availability varies by browser/device.
- AI responses can be inaccurate. Verify important information.
