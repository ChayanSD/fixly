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
  drizzle.config.ts
  drizzle/
  src/
    server.ts
    openai.ts
    prompt.ts
    validation.ts
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Add your backend configuration to `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.4-mini
DATABASE_URL=postgresql://fixly:password@postgres-host:5432/fixly
REDIS_URL=redis://redis-host:6379
REDIS_KEY_PREFIX=fixly:prod:
PORT=4000
CORS_ALLOW_ALL=true
ALLOWED_ORIGINS=
DAILY_REWRITE_LIMIT=100
REWRITE_CACHE_TTL_SECONDS=86400
AI_TIMEOUT_MS=15000
OPENAI_INPUT_COST_PER_1M=0.75
OPENAI_OUTPUT_COST_PER_1M=4.50
```

Run migrations:

```bash
npm run db:migrate
```

`CORS_ALLOW_ALL=true` is intended for beta testing from arbitrary websites like Facebook, Gmail, Notion, or LinkedIn. For a public production backend, turn it off and add a tighter extension/auth policy.

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

The extension never calls OpenAI directly. It sends selected text and the chosen action to the backend only after the user clicks an action.

## Backend API

Production endpoints are under `/api/v1`.

```http
POST /api/v1/rewrites
```

```json
{
  "installId": "fx_example_install_id",
  "text": "hello my name are chayan",
  "action": "fix_grammar",
  "instruction": "make it friendly",
  "source": {
    "origin": "https://www.facebook.com",
    "hostname": "www.facebook.com",
    "editorType": "textarea"
  }
}
```

`action` and `instruction` are optional. If neither is sent, the backend defaults to grammar, spelling, punctuation, and clarity fixes.

Memory endpoints:

```http
GET /api/v1/installations/:installId/memory
PUT /api/v1/installations/:installId/memory
```

The backend stores rewrite metadata in Postgres, not selected text or rewritten output. Redis stores short-lived cache entries and daily quota counters.

## Background Sync And Behavior

Rewrite responses are returned before non-critical analytics writes finish. The backend logs rewrite metadata and updates writing behavior in a background task so slow Postgres writes do not block the user response.

Behavior storage is aggregate-only:

```txt
writing_profiles
writing_behavior_daily
```

The backend stores preference scores, context counts, input length totals, latency totals, cache hit counts, and action counts. It does not store selected text or rewritten output. Learned behavior is used only as a light style hint, and the current action/custom instruction always wins.
