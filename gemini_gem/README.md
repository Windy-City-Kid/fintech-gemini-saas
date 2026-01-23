# 🤖 Gemini Tools: Fintech Gemini SaaS

This directory contains Gemini-compatible tools, configurations, and knowledge for the **Joyful Savings Dash** project.

---

## 📄 Main Config

- **`gemini.yaml`** — Entry point for Gemini tool definitions and config.

---

## 🧰 Tools

Located in `gemini_gem/tools/`:

1. **`lovable-openapi.yaml`**  
   - Integrates with Lovable API (`/api/lovable/sync-event`)  
   - Used to sync frontend events

2. **`prompt_logger.js`**  
   - Custom JavaScript logger  
   - Logs prompt interactions with hash for audit trail

3. **`file_retriever.yaml`**  
   - Fetches knowledge file content from project

---

## 📚 Knowledge

Located in `gemini_gem/knowledge/`:

- `fintech-docs.md` — Fintech project documentation used by Gemini tools

---

## ✅ Test Summary

All tools are fully tested and operational:

- ✅ Logging with hash  
- ✅ Markdown file access  
- ✅ API call to backend running on `localhost:3000`

---

## 📦 Usage

You can now use this toolset with Gemini CLI or Cursor:

```bash
gemini use gemini_gem/
```

---

## 🔗 Backend Integration

The backend API server must be running for Lovable API calls:

```bash
cd Fintech_Gemini_SaaS/backend
npm start
# Server runs on http://localhost:3000
```

---

## 📝 File Structure

```
gemini_gem/
├── gemini.yaml              # Main configuration
├── README.md                # This file
├── knowledge/
│   └── fintech-docs.md      # Knowledge base
└── tools/
    ├── lovable-openapi.yaml # OpenAPI spec
    ├── file_retriever.yaml  # File retriever config
    └── prompt_logger.js     # Prompt logger function
```
