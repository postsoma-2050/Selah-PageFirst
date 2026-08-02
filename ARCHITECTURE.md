# PageFirst AI Assistant Architecture Document

## Overview & Product Philosophy

> **🎯 Product Manifesto**
> - **We Are**: A privacy-first **Page-First AI Assistant** operating tightly around the active web page: summarizing, analyzing insights, extracting concrete facts, and conducting multi-turn Q&A grounded in current document text.
> - **We Are NOT**: A generic "all-in-one chat shell" or a heavy multi-document RAG / Vector DB knowledge base.
> - **Unshakable Core**: Active Page Text is the #1 Ground Truth; Summarize/Insights/Facts stay 100% Page-Only; Web Search is Opt-In Only; Memory is Auxiliary; Data stays 100% Local (BYOK).

---

## 🏗️ Core Architecture Pillars

1. **Active Context First**: Automatically captures and cleans the current web page DOM context before prompt assembly.
2. **On-Demand Conditional Web Strategy**: Answers strictly from page text by default; queries external search only when explicitly requested.
3. **Lightweight Local Memory**: Persists 4-tier profile, topic, task, and session memory strictly in browser local storage without remote servers.
4. **BYOK (Bring Your Own Key)**: Native support for local LLMs (Ollama, Chrome AI / Gemini Nano) and OpenAI-compatible API endpoints (DeepSeek, GPT-4o-mini).

---

## System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|   +------------------------------------+   +----------------------------------+   |
|   |         Sidebar (Primary)          |   |       Options / Web Workbench   |   |
|   |  - Page Context Bar                |   |  - Provider Management           |   |
|   |  - Quick Page-Native Actions       |   |  - Memory Inspector & History    |   |
|   |  - Streamed Chat View              |   |  - System Diagnostics            |   |
|   +------------------------------------+   +----------------------------------+   |
+------------------------------------------+----------------------------------------+
                                           |
                                 Message Passing (lib/messaging)
                                           |
+------------------------------------------v----------------------------------------+
|                             BACKGROUND SERVICE WORKER                             |
|  - Extension Lifecycle, SidePanel Behavior Handler, Context Menu Dispatcher        |
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                                CORE MODULE PIPELINE                               |
|                                                                                   |
|  1. Page Capture Module (src/modules/page-capture)                                |
|     - Extract DOM title, meta, text content, user selection                       |
|     - Clean noise & script elements                                               |
|                                                                                   |
|  2. Context Pipeline (src/modules/context-pipeline)                               |
|     - Truncate & estimate token budgets                                           |
|     - Format page snapshot into structured prompt frame                           |
|     - Character length guard check (< 30 chars warning)                           |
|                                                                                   |
|  3. Memory System (src/modules/memory)                                            |
|     - 4-Tier Memory Schema (Profile, Topic, Task, Session)                        |
|     - Keyword & action-gated retriever (retrieval-based, non-monolithic)          |
|                                                                                   |
|  4. Chat Orchestrator (src/modules/chat-orchestration)                            |
|     - Decision engine (Page-only vs Web-enriched)                                 |
|     - Multi-turn conversation state machine & streaming response engine           |
|                                                                                   |
|  5. Provider Adapter System (src/modules/provider-adapter)                        |
|     - Unified IProviderAdapter interface & message role sanitizer                 |
|     - Drivers: Ollama, Chrome AI (Gemini Nano), OpenAI-Compatible                 |
+-----------------------------------------------------------------------------------+
```

---

## Detailed Module Responsibilities

### 1. Page Capture Module (`src/modules/page-capture`)
- **Responsibility**: Safe, clean extraction of active web page context.
- **Components**:
  - `extractor.ts`: Executed via content scripts or injected scripts to pull document metadata, page title, canonical URL, visible article body, and highlighted user selections.
  - `types.ts`: `PageSnapshot` interface representing full text, selection, metadata, candidateTarget, and character counts.

### 2. Context Pipeline (`src/modules/context-pipeline`)
- **Responsibility**: Truncating, scoring, and preparing extracted content for LLM input context window limits.
- **Components**:
  - `pipeline.ts`: Character estimation, intelligent element splitting, context budget allocation.
  - `types.ts`: `ContextFrame` structure containing system instructions, page grounding text, and selection context.

### 3. Chat Orchestrator Engine (`src/modules/chat-orchestration`)
- **Responsibility**: Managing multi-turn conversation states, routing user actions, and coordinating prompt construction with provider adapters.
- **Components**:
  - `orchestrator.ts`: Conversation session manager, page-native action runner ("Summarize", "Key Insights", "Fact Extraction", "Q&A"), and streaming response engine.
  - `types.ts`: `ChatMessage`, `ChatSession`, `ActionType` definition.

### 4. Lightweight Memory System (`src/modules/memory`)
- **Responsibility**: Structured, privacy-first local storage for user preferences and persistent context.
- **Components**:
  - `types.ts`: Schema for 4 distinct memory tiers (Profile, Topic, Task, Session).
  - `store.ts`: Local storage engine wrapping `chrome.storage.local`.
  - `retriever.ts`: Action-gated retrieval-based context selector (injects only relevant memory fragments per prompt).

### 5. Provider Adapter Interface (`src/modules/provider-adapter`)
- **Responsibility**: Abstracting LLM vendors behind a unified streaming interface and sanitizing message roles for proxy compatibility.
- **Components**:
  - `types.ts`: `IProviderAdapter`, `ProviderConfig`, `GenerationOptions`.
  - Drivers: `ollama.ts`, `chrome-ai.ts`, `openai-compatible.ts`.

---

## 🚀 V1.1 Release Brief & Priorities

- **In Scope for V1.1**:
  1. Markdown & Code Highlight rendering (`react-markdown` + `remark-gfm`).
  2. Global Keyboard Shortcut (`Cmd/Ctrl+Shift+Y`) + Selection Text Q&A.
  3. One-click Session Export to Markdown (`.md`).
- **Out of Scope for V1.1**:
  - No new providers, memory types, search modes, or UI framework rewrites.
