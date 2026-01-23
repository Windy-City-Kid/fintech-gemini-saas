# 🚀 Backend API — Fintech Gemini SaaS

This backend powers Gemini tools and handles requests from the frontend and agent integrations.

---

## 🟢 Status

- ✅ Server running on `http://localhost:3000`
- ✅ No vulnerabilities
- ✅ Gemini tool integration tested

---

## 📦 Dependencies

- Node.js (from `.nvmrc` or system)
- Express.js
- dotenv
- cors, body-parser, etc.

Install with:

```bash
npm install
```

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:3000
```

---

## 📡 API Endpoints

### Lovable API Integration
- **POST** `/api/lovable/sync-event`
  - Triggers Lovable sync events
  - Body: `{ event, user_id, timestamp }`

### WordPress Integration
- **POST** `/api/wordpress/insert-post`
  - Creates WordPress posts from Gemini
  - Body: `{ title, type, status }`

### Prompt Logging
- **POST** `/api/log/ai-prompt`
  - Logs Gemini interactions for audit
  - Body: `{ user_id, prompt, response, timestamp }`
  - Returns: `{ status: 'logged', hash: <sha256> }`

---

## 🔧 Configuration

Environment variables (`.env`):
```
PORT=3000
API_KEY=your_api_key_here
WP_TOKEN=your_wp_token_here
INTERNAL_API_KEY=your_internal_key_here
```

---

## 🧪 Testing

Test endpoints with curl:

```bash
# Test Lovable sync
curl -X POST http://localhost:3000/api/lovable/sync-event \
  -H "Content-Type: application/json" \
  -d '{"event":"test","user_id":"test-user"}'

# Test prompt logging
curl -X POST http://localhost:3000/api/log/ai-prompt \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","prompt":"Hello","response":"Hi there"}'
```

---

## 📁 Project Structure

```
backend/
├── app.js              # Main Express server
├── api/
│   ├── lovable.js      # Lovable API routes
│   ├── wordpress.js    # WordPress integration
│   └── log.js          # Prompt logging
├── utils/
│   └── hash.js         # SHA-256 hashing utility
├── .env                # Environment variables
└── package.json        # Dependencies
```

---

## 🔗 Integration with Gemini

This backend is configured as a tool in `gemini_gem/gemini.yaml`:
- Tool name: `api-call-lovable`
- Type: `openapi`
- Spec: `tools/lovable-openapi.yaml`

---

## 📝 License

ISC
