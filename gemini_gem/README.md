# Gemini Tool Configuration

This directory contains all Gemini AI tool configurations and knowledge files.

## 📁 Structure

```
gemini_gem/
├── gemini.yaml              # Main Gemini configuration file
├── tools/                   # Gemini tool definitions
│   ├── lovable-openapi.yaml    # Lovable API integration
│   ├── file_retriever.yaml     # File retrieval tool
│   └── prompt_logger.js        # Prompt logging function
├── knowledge/               # Knowledge base for Gemini
│   └── fintech-docs.md         # Fintech documentation
└── README.md               # This file
```

## 🧰 Tools

### 1. Lovable API (`tools/lovable-openapi.yaml`)
- **Purpose**: Integrates with Lovable API for sync events
- **Endpoint**: `/api/lovable/sync-event`
- **Type**: OpenAPI specification

### 2. File Retriever (`tools/file_retriever.yaml`)
- **Purpose**: Retrieves and reads project files
- **Type**: File retriever tool
- **Usage**: Allows Gemini to access project documentation and source files

### 3. Prompt Logger (`tools/prompt_logger.js`)
- **Purpose**: Logs AI interactions with SHA-256 hashing for audit trail
- **Type**: JavaScript function
- **Features**: 
  - Hashes prompts and responses
  - Stores interaction history
  - Provides audit logging

## 📚 Knowledge Base

### `knowledge/fintech-docs.md`
- Contains fintech project documentation
- Used by Gemini for context and understanding
- Includes architecture, APIs, and system information

## 🚀 Usage

### Start Gemini CLI Dev Server

```bash
# Set your API key
export GEMINI_API_KEY=your_api_key_here

# Or inline
GEMINI_API_KEY=your_api_key_here npx @google/gemini-cli@latest dev gemini_gem/
```

### Configuration

The main configuration is in `gemini.yaml`, which:
- Defines tool references
- Specifies knowledge base files
- Sets entry point and default tool

## 🔧 Development

### Adding New Tools

1. Create tool file in `tools/` directory
2. Add reference to `gemini.yaml` under `tools:`
3. Restart Gemini CLI dev server

### Updating Knowledge Base

1. Edit files in `knowledge/` directory
2. Update `gemini.yaml` if adding new knowledge files
3. Restart Gemini CLI dev server to reload

## 📝 Notes

- All tools must be properly configured in `gemini.yaml`
- Knowledge files should be in Markdown format for best results
- JavaScript tools must use ES module syntax (`import`/`export`)
- OpenAPI tools require valid OpenAPI 3.0 specification

## 🔗 Related Files

- Backend API: `Fintech_Gemini_SaaS/backend/`
- API Routes: `Fintech_Gemini_SaaS/backend/api/`
