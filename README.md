# Fixly AI Rewrite MVP

Chrome Extension MV3 + Node.js backend for rewriting selected text inside `input`, `textarea`, and `contenteditable` editors.

## Structure

```txt
extension/
  package.json
  tsconfig.json
  manifest.json
  src/
    content.ts
    content.css
  dist/
    content.js
    content.css

backend/
  package.json
  tsconfig.json
  .env.example
  src/
    server.ts
    gemini.ts
    openai.ts
    provider.ts
    prompt.ts
    validation.ts
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Add your AI provider and API key to `backend/.env`:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=4000
CORS_ALLOW_ALL=true
ALLOWED_ORIGINS=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-5.4-mini
```

`CORS_ALLOW_ALL=true` is intended for local MVP testing from arbitrary websites like Facebook, Gmail, Notion, or LinkedIn. For a deployed backend, turn it off and use authentication plus an explicit origin policy.

Use Gemini:

```env
AI_PROVIDER=gemini
```

Use OpenAI:

```env
AI_PROVIDER=openai
```

Run the backend:

```bash
npm run dev
```

The API will run at `http://localhost:4000`.

## Extension Setup

```bash
cd extension
npm install
npm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension/` folder.

## Usage

1. Start the backend.
2. Select 3 or more characters inside an input, textarea, or contenteditable editor.
3. Choose a rewrite action from the floating popup.
4. The selected text is replaced with the AI result.

The extension never calls Gemini or OpenAI directly. It sends selected text and the chosen action to the local backend only after the user clicks an action.
