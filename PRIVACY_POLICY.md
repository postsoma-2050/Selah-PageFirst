# Privacy Policy for Selah PageFirst (v1.1.0)

**Effective Date**: August 2, 2026  
**Publisher**: postsoma-2050  
**GitHub Repository**: [https://github.com/postsoma-2050/Selah-PageFirst](https://github.com/postsoma-2050/Selah-PageFirst)

---

## 🛡️ Core Privacy Commitment

**Selah PageFirst** is a privacy-first, local-first browser sidecar extension designed specifically for active web page reading, deep structural breakdown, and grounded AI analysis.

Our core commitment:
- **Zero Data Collection**: We do NOT collect, sell, monitor, or track your personal data, browsing activity, or page content.
- **Zero Analytics / Telemetry**: No third-party analytics (e.g. Google Analytics, Mixpanel) or remote logging scripts are integrated into the extension.
- **100% Local-First**: All your data—including API keys, user preferences, memory topics, and session history—remains strictly on your local device.
- **Bring Your Own Key (BYOK)**: No cloud proxy or central relay server. Your requests are sent directly from your browser to your configured LLM endpoint.

---

## 📦 What Data We Access & How It Is Used

### 1. Active Page Content (`activeTab` / `scripting`)
- **What is accessed**: The main DOM text body of the active web tab you are currently reading.
- **Purpose**: To provide grounded page summaries, key insights, facts extraction, and selection Q&A.
- **Storage**: Page text is processed in memory on your local machine only while analyzing the document and is never sent to any server other than your configured LLM provider.

### 2. API Keys & Configuration (`storage`)
- **What is stored**: Your user-provided LLM API Key, Base URL, preferred model name, response language, and tone preferences.
- **Storage Location**: Stored exclusively in your browser's local storage (`chrome.storage.local`).
- **Security**: API Keys are masked in the UI and are never transmitted anywhere except to your specified API endpoint.

### 3. Local Memory Tiers (`storage`)
- **What is stored**: 4-Tier local memory (User Profile, Learned Knowledge Topics, Task Context, and Session History).
- **Purpose**: To maintain conversation continuity and personalize reading tone across sessions.
- **User Control**: You can view, edit, or delete individual memory items at any time, or clear all memory with one click using the **`[ DANGER_ZONE // RESET ]`** button in Settings.

---

## 🌐 Third-Party Services & Model Endpoints

Selah PageFirst allows you to connect your own LLM providers (BYOK):

- **OpenAI / DeepSeek / OpenAI-Compatible APIs**: Requests are sent directly via standard HTTPS POST to the endpoint specified in your settings.
- **Ollama (Local LLM)**: Requests are sent directly to your local machine address (e.g. `http://localhost:11434`), remaining 100% offline.
- **Chrome Built-in AI (Gemini Nano)**: Runs entirely offline on your local device via Chrome's experimental AI APIs.

We do NOT operate any intermediary relay servers, cloud proxies, or tracking services.

---

## 🔒 Permissions Justification

| Permission | Purpose & Justification |
|---|---|
| `activeTab` | Required to extract article text from your active tab when you trigger an analysis action. |
| `scripting` | Required to execute candidate DOM extraction scripts locally within the active page. |
| `storage` | Required to store your BYOK settings, API keys, and memory topics in `chrome.storage.local`. |
| `sidePanel` | Required to render the assistant interface inside Chrome's native side panel window. |
| `tabs` | Required to detect tab switches and keep active page context synchronized. |

---

## 🧹 Data Retention & Deletion

- **Local Storage Deletion**: You can purge all stored memory, keys, and session history at any time from the **Selah Workbench (`OptionsApp.tsx`)** via the **Clear All Memory** button.
- **Uninstalling Extension**: Uninstalling Selah PageFirst from Google Chrome immediately and permanently removes all stored data from your browser storage.

---

## 📬 Contact & Open Source

Selah PageFirst is open-source and authored by **postsoma-2050**.

- **GitHub Repository**: [https://github.com/postsoma-2050/Selah-PageFirst](https://github.com/postsoma-2050/Selah-PageFirst)
- **Issue Tracker**: [https://github.com/postsoma-2050/Selah-PageFirst/issues](https://github.com/postsoma-2050/Selah-PageFirst/issues)
