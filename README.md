# Selah PageFirst (v1.1.0)

> **Selah Reading Tools • Page-First AI Assistant • by postsoma-2050**  
> GitHub Repository: [https://github.com/postsoma-2050/Selah-PageFirst](https://github.com/postsoma-2050/Selah-PageFirst)

---

## 🎯 Product Manifesto

- **What We Are**:
  A privacy-first **Page-First AI Assistant** operating in Chrome's native Side Panel. It helps users summarize, analyze insights, extract concrete facts, chat continuously grounded in active page text, and conditionally complete background info with opt-in web search.

- **What We Are NOT**:
  We are **NOT** a general-purpose all-in-one chat shell (like generic ChatGPT clones), nor a heavy multi-document RAG / Vector DB knowledge base platform.

- **5 Unshakable Principles**:
  1. **Active Page Context is ALWAYS Primary Ground Truth**: Current active tab body text is the highest-priority context.
  2. **Summarize / Insights / Facts are PERMANENTLY Page-Only**: Never inject web search or background memory into factual summaries.
  3. **Conditional Web Search is Opt-In Only**: Default is 100% Page-Only. Web search is only triggered when explicitly enabled by user.
  4. **Memory is Auxiliary**: Memory only assists response tone and background context; it never pollutes page facts or overrides page text.
  5. **Local-First & BYOK**: All data remains 100% local in `chrome.storage.local`. Bring Your Own Key (BYOK) is the sole LLM provider model.

---

## ✨ Features (v1.1.0 Release)

- **📄 Page-First Active Tab Extraction**: Automatically captures main article content (`article`, `main`, `.markdown-body`, or candidate selectors) and grounds all AI analysis in page context.
- **⚡ 30s Fast Scan & 📰 4-Stage Critical Review**:
  - `[ 30S FAST SCAN ]`: Executive summary, key takeaways, and TL;DR.
  - `[ 4STAGE CRITICAL ]`: 5W1H facts matrix, evidence checking, synthesis, and missing voice analysis.
  - `● 100% GROUNDED`: Pure page analysis mode.
  - `● PAGE + WEB`: Opt-in web search supplement mode.
- **💬 Selection Q&A & Keyboard Shortcut**:
  - Press `Cmd/Ctrl+Shift+Y` to toggle the sidepanel.
  - Highlight any text on the webpage to ask targeted follow-up questions.
- **🎨 Markdown Rendering & Code Highlight**:
  - Rich typography rendering powered by `react-markdown` and `remark-gfm`.
  - Monospace bracketed code copying (`[ COPY ]` / `[ COPIED ✓ ]`).
- **📥 Session Export**: One-click export of chat sessions into formatted `.md` Markdown files.
- **🌐 3-Way Bilingual Localization**: Synchronized UI language switching across English, Traditional Chinese (`zh-TW`), and Simplified Chinese (`zh-CN`).
- **🛡️ BYOK Provider Workbench (`OptionsApp.tsx`)**:
  - Direct connection to OpenAI-compatible endpoints (GPT-4o-mini, DeepSeek API), Ollama (Local LLM), and Chrome Built-in AI.
  - No cloud proxy, zero telemetry, 100% local storage in `chrome.storage.local`.

---

## 🛠️ Build & Installation

### Prerequisites
- Node.js >= 18
- npm >= 9

### Build Zip Package
```bash
# Install dependencies
npm install

# Compile TypeScript & Build Production Chrome Extension Zip
npm run compile && npm run zip
```

### Production Build Archive
Upon running `npm run zip`, the production extension package is created at:
```text
dist/pagefirst-ai-assistant-1.1.0-chrome.zip
```

### Load Extension in Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Drag and drop `dist/pagefirst-ai-assistant-1.1.0-chrome.zip` or click **Load unpacked** and select the `dist/chrome-mv3` folder.

---

## 🏗️ Architecture & Module Map

```text
src/
├── entrypoints/
│   ├── sidepanel/         # SidePanel Workspace UI (SidePanel.tsx)
│   ├── options/           # Selah Workbench Settings & 4-Tier Memory (OptionsApp.tsx)
│   ├── background.ts      # Extension Service Worker
│   └── content.ts         # Page Capture & Extraction Script
└── modules/
    ├── page-capture/      # Candidate DOM text extraction & cleaning (extractor.ts)
    ├── context-pipeline/  # Context frame building & character length guards
    ├── chat-orchestration/# Prompt assembly, multi-turn payload & streaming (orchestrator.ts)
    ├── provider-adapter/  # BYOK adapters (OpenAI-compatible, Ollama, Chrome AI)
    ├── memory/            # 4-Tier local memory store & gated retriever (store.ts)
    └── web-search/        # Conditional DDG searcher & context formatting
```

---

## 🔒 Privacy & License

- **Privacy Policy**: Read [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full privacy guarantees.
- **Author**: `postsoma-2050`
- **Repository**: [https://github.com/postsoma-2050/Selah-PageFirst](https://github.com/postsoma-2050/Selah-PageFirst)
- **License**: MIT
