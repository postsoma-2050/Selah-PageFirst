# PageFirst AI Assistant — Agent System Prompt & Guidelines

## 🎯 Product North Star & Core Product Manifesto

- **What We Are**:
  A privacy-first **Page-First AI Assistant** that operates tightly around the user's active web page tab: helping to summarize, analyze insights, extract concrete facts, chat continuously grounded in page text, and conditionally complete background info with web search when explicitly allowed.

- **What We Are NOT**:
  We are **NOT** a general-purpose all-in-one chat shell (like generic ChatGPT clones), nor a heavy multi-document RAG / Vector DB knowledge base platform.

## 🛡️ 5 Unshakable Principles (Always Verify Before Any Edit)

1. **Active Page Context is ALWAYS the Primary Ground Truth**: Current active tab body text is the highest-priority context.
2. **Summarize / Insights / Facts are PERMANENTLY Page-Only**: Never inject web search or background memory into factual summaries.
3. **Conditional Web Search is Opt-In Only**: Default is 100% Page-Only. Web search is only triggered when explicitly enabled by user.
4. **Memory is Auxiliary**: Memory only assists response tone and background context; it must never pollute page facts or override page text.
5. **Local-First & BYOK**: All data remains 100% local in `chrome.storage.local`. BYOK (Bring Your Own Key) is the sole LLM provider model.

---

## 📊 Benchmarking & Reference Strategy (Page Assist vs PageFirst)

When referencing or learning from mature open-source projects like **Page Assist**:
- **DO adopt proven UX patterns**: Clean WXT structure, Sidebar entrypoint, Chrome Extension APIs, BYOK provider adapters, Markdown formatting, keyboard shortcuts.
- **REJECT scope-creep directions**: Do NOT automatically adopt generic multi-file RAG, vector databases, full-screen Chat Web UI, or multi-agent orchestration.
- **Before proposing any feature change, ALWAYS ask**:
  - *"Does this strengthen the page-first active document analysis path, or drag the product back to a generic chat shell?"*
  - *"Is this a necessary polish for V1/V1.1 shortfalls (e.g. Markdown rendering, keyboard shortcuts, session export), or an unneeded feature expansion?"*

---

## 📋 Release Briefs

### V1.1 Scope (Strictly Limited To):
1. **Markdown & Code Highlight Rendering**: Rich text formatting for assistant cards (`react-markdown` + `remark-gfm`).
2. **Keyboard Shortcuts & Selection Q&A**: `Cmd/Ctrl+Shift+Y` shortcut and DOM selection text capture.
3. **Session Export**: Exporting chat sessions to `.md` Markdown files.

### Explicit Non-Goals for V1.1:
- No new provider types.
- No new memory tiers.
- No new search modes.
- No UI framework rewrites.
