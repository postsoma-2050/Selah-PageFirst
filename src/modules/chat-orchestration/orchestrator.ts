import { OrchestrationRequest, ActionType, ChatMessage, AnalysisMode } from './types';
import { createProviderAdapter, ChatMessagePayload } from '../provider-adapter';
import { buildContextFrame } from '../context-pipeline';
import { MemoryStore, retrieveRelevantMemory } from '../memory';
import { WebSearcher, formatWebSearchContext } from '../web-search/searcher';

export function isEnglishPage(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 1000);
  const asciiCount = (sample.match(/[a-zA-Z]/g) || []).length;
  const totalCount = sample.replace(/\s+/g, '').length;
  return totalCount > 0 && (asciiCount / totalCount) > 0.55;
}

export class ChatOrchestrator {
  private memoryStore: MemoryStore;
  private webSearcher: WebSearcher;

  constructor() {
    this.memoryStore = new MemoryStore();
    this.webSearcher = new WebSearcher();
  }

  private buildActionPrompt(
    actionType: ActionType,
    mode: AnalysisMode = 'fast-scan',
    customQuery?: string,
    hasWebContext?: boolean,
    lang: string = 'auto',
    isENPage: boolean = false
  ): string {
    const isEN = lang === 'en' || (lang === 'auto' && isENPage);

    if (customQuery && customQuery.trim().length > 0) {
      if (hasWebContext) {
        return isEN
          ? `Please answer this query using the active page text as your PRIMARY source of truth.
Use the provided external web search supplement ONLY to provide missing background context or perform external fact checks.

Mandatory Formatting Rule:
Structure your response into two distinct sections:
### 📄 Active Page Context
[Direct answer based on the active web page]

### 🌐 External Web Supplement
[Supplementary context, background, or real-time fact checks retrieved from search]

Query: ${customQuery}`
          : `Please answer this query using the active page text as your PRIMARY source of truth.
Use the provided external web search supplement ONLY to provide missing background context or perform external fact checks.

Mandatory Formatting Rule:
Structure your response into two distinct sections:
### 📄 Active Page Context
[Direct answer based on the active web page]

### 🌐 External Web Supplement
[Supplementary context, background, or real-time fact checks retrieved from search]

Query: ${customQuery}`;
      }

      if (mode === 'critical-analysis') {
        return isEN
          ? `[Critical Analysis Mode Q&A] Please answer the following question strictly based on the active web page text with objective evidence and logical rigor:\n${customQuery}`
          : `[批判性精讀模式问答] 请基于当前网页正文，用严谨、客观、注重新闻证据与逻辑检验的态度回答以下问题：\n${customQuery}`;
      }

      return customQuery;
    }

    switch (actionType) {
      case 'summarize':
        if (mode === 'critical-analysis') {
          if (isEN) {
            return `You are a professional News Analyst & Critical Thinking Coach. Read the active web page text carefully and analyze it strictly according to the following 4-stage framework:

## Stage 1: The Facts (5W1H Matrix)
Synthesize the core facts objectively in bullet points:
- **Who (Main subjects / Stakeholders):**
- **When (Key timeline / Date):**
- **Where (Location / Domain context):**
- **What (Core event / Announcement):**
- **Why (Root causes / Drivers):**
- **Consequences (Impact / Next developments):**
- **Structural Note:** Briefly evaluate whether the article background is introduced clearly.

## Stage 2: The Logic & Data (Evidence Check)
1. **Key Data & Metrics:** Important numbers, statistics, or quotes cited in the text.
2. **Logic & Cause-Effect:** Identify key cause-and-effect claims or transitions; evaluate whether the reasoning is valid.
3. **Information Quality:** Is the argumentation clear, specific, and supported by evidence?

## Stage 3: The Synthesis (Rephrased Summary)
Write a 2-3 sentence rephrased summary in your own words (explaining what happened, why it matters, and who is affected). DO NOT copy exact sentences from the article.

## Stage 4: Critical Thinking & Source Audit
1. **Source Check:** What sources does the report rely on? (Official statements, single source, multi-perspective verification?)
2. **Potential Stance & Bias:** Are there underlying biases, loaded framing, or specific editorial stances?
3. **Missing Voices:** Which key stakeholders' perspectives are omitted or underrepresented?

---
**Final Evaluation:**
Provide a score (1-10) for the article's Logical Rigor and Information Completeness with brief justifications.`;
          }

          return `你是一位專業的「新聞媒體分析師」與「批判性思維教練」。請閱讀這篇網頁正文，嚴格按照以下的【精讀邏輯流程】進行拆解與分析：

## 第一階段：結構與六要素（The Facts）
請用條列式快速歸納出以下客觀資訊（5W1H）：
- **Who（主角/關係人）：**
- **When（時間）：**
- **Where（地點）：**
- **What（發生了什麼事）：**
- **Why（發生原因）：**
- **Consequences（可能的後果/影響）：**
- **結構觀察：** 簡短點評文章開頭背景交代是否清晰？結尾是否有點出延伸意義？

## 第二階段：邏輯與關鍵資訊（The Logic）
1. **關鍵數據：** 文中引用的重要數字或統計。
2. **邏輯關係：** 找出文中的因果關係或轉折，解釋其邏輯推演是否合理。
3. **資訊品質檢查：** 文章論述是否清晰？資訊是否具體精確？

## 第三階段：摘要重述（The Synthesis）
用你自己語言寫一段 2-3 句話短摘要（說明事件是什麼、為何重要、影響了誰），嚴禁直接複製原文句子。

## 第四階段：批判性追問（The Critical Thinking）
1. **消息來源檢視：** 報導主要根據什麼來源？（官方說法、單一消息源、多方查證？）
2. **潛在立場分析：** 措辭或切入點是否存在特定的觀點偏向或隱含立場？
3. **缺席的聲音：** 有哪些利害關係人（Stakeholders）的觀點被忽略或未被提及？

---
**最後總結：**
請給這篇報導的「邏輯嚴謹度」與「資訊完整度」打分（1-10分），並簡述理由。`;
        }

        // Fast Scan Mode Prompt
        if (isEN) {
          return `You are a high-efficiency reading assistant. Help the user master the core of the web page in 30 seconds. Output strictly in the following compact format without conversational intros:

### 📝 [Article Title]
> ⏱️ **Fast Scan**: [One-sentence core value, approx 25 words]
> ⭐ **Rating**: [1-10] | 🔥 **Recommended For**: [Target audience]

#### 🚀 Top 3 Key Insights
* **[Keyword]**: [Core point 1]
* **[Keyword]**: [Core point 2]
* **[Keyword]**: [Core point 3]

#### 💬 Highlight Quote
> "[Most insightful sentence directly from the original text]"

---
**👇 Enter number to explore deeper:**
**1** [Deep Notes] (Detailed structure & logic)
**2** [Critical View] (Counter-arguments & blind spots)
**3** [Practical Uses] (How to apply to life/work)
**4** [Key Terms] (Glossary & terminology explained)`;
        }

        return `你是一位高效閱讀助手。你的目標是幫助用戶在 30 秒內掌握網頁核心。請嚴格按照以下緊湊格式輸出，不要有開場白：

### 📝 [文章中文標題]
> ⏱️ **速讀**：[用一句話概括核心價值，約 50 字]
> ⭐ **評分**：[1-10] | 🔥 **推薦給**：[適合什麼樣的人讀]

#### 🚀 核心洞察 (Top 3 Insights)
* **[關鍵詞]**：[核心論點 1]
* **[關鍵詞]**：[核心論點 2]
* **[關鍵詞]**：[核心論點 3]

#### 💬 黃金金句
> "[原文中最具洞察力的一句話]"
> *([簡短的中文譯文])*

---
**👇 請輸入數字深入探索：**
**1** [深度筆記] (詳細結構與邏輯)
**2** [批判視角] (反對意見與盲點)
**3** [實用轉化] (如何應用到生活/工作)
**4** [術語解釋] (解釋文中的專業名詞)`;

      case 'analyze-insights':
        if (mode === 'critical-analysis') {
          return isEN
            ? `Please perform a Deep Logical Breakdown & Critical Insight on the active web page text:\n1. Core Arguments & Underlying Assumptions\n2. Logical Deduction & Evidence Sufficiency\n3. Omitted Voices & Stance/Bias Analysis`
            : `請針對這篇網頁正文做【深度邏輯拆解与批判性洞察】：\n1. **核心立論与隱含假設**：作者的主要論點是什么？背後隐藏了什么未明說的假設？\n2. **邏輯推演与證據支持**：文章的因果推导是否合理？引用的證據或數據是否充份？\n3. **缺席的声音与立場偏向**：文章偏向谁的立場？忽略了哪些重要利害關係人的聲音？`;
        }
        return isEN
          ? `Please extract the Top 3 core insights, key logic deductions, and practical applications from this page.`
          : `请提取本文的 Top 3 核心洞察、推演逻辑与落地实用转化。`;

      case 'extract-facts':
        if (mode === 'critical-analysis') {
          return isEN
            ? `Please synthesize the objective 5W1H Fact Matrix strictly from the active page text:\n- Who / When / Where\n- What / Why / Consequences\n- Objective Data, Dates & Quotes List (zero model speculation).`
            : `請嚴格基於本篇網頁正文，梳理【5W1H 客觀事實矩陣】：\n- **Who / When / Where**：主角、關鍵時間点、地點\n- **What / Why / Consequences**：核心事件、引發原因与后續影響\n- **客觀數據与引用**：文中包含的所有具体數字、日期与權威引用清单（零模型猜測）。`;
        }
        return isEN
          ? `Please extract all verified hard facts, specific dates, key numbers, and statistical metrics from this page.`
          : `请提取本文的所有硬核事实、具体日期、关键数字与统计数据。`;

      case 'ask-document':
      case 'custom-query':
      default:
        return customQuery || (isEN ? 'Please summarize the core content of this active web page.' : '请总结这篇网页的核心内容。');
    }
  }

  async runAction(request: OrchestrationRequest): Promise<string> {
    if (!request.snapshot || request.snapshot.characterCount < 30 || !request.snapshot.fullText.trim()) {
      throw new Error(
        `[未成功读取页面正文] 当前网页提取到的有效字符数不足 (仅 ${request.snapshot?.characterCount || 0} 字符)。\n` +
        `为避免模型基于标题伪造总结，系统已阻止请求。请手动刷新当前网页或切换至包含正文内容的页面重试。`
      );
    }

    const adapter = createProviderAdapter(request.providerConfig);
    const contextFrame = buildContextFrame(request.snapshot);
    const mode: AnalysisMode = request.analysisMode || 'fast-scan';

    // 1. Retrieve relevant memory & profile language preference
    const store = await this.memoryStore.getStore();
    const prefLang = request.responseLanguage || store.profile?.language || 'auto';
    const isENPage = isEnglishPage(request.snapshot.fullText);

    const memoryContext = retrieveRelevantMemory(
      store,
      request.snapshot.metadata.title,
      request.customQuery || '',
      request.actionType
    );

    // 2. CONDITIONAL WEB SEARCH
    const isStrictPageOnlyAction =
      request.actionType === 'summarize' ||
      request.actionType === 'extract-facts' ||
      request.actionType === 'analyze-insights';

    let webContext = '';
    const shouldSearchWeb =
      !isStrictPageOnlyAction &&
      (request.enableWebSearch === true || request.actionType === 'web-search');

    if (shouldSearchWeb) {
      const searchQuery = request.customQuery || request.snapshot.metadata.title;
      const webRes = await this.webSearcher.search(searchQuery);
      webContext = formatWebSearchContext(webRes);
    }

    const userQuery = this.buildActionPrompt(
      request.actionType,
      mode,
      request.customQuery,
      Boolean(webContext),
      prefLang,
      isENPage
    );

    const isEN = prefLang === 'en' || (prefLang === 'auto' && isENPage);
    const langInstruction = isEN
      ? `\n[RESPONSE LANGUAGE INSTRUCTION]: Please output all analysis and responses in clear, professional English.`
      : prefLang === 'zh-CN'
      ? `\n[RESPONSE LANGUAGE INSTRUCTION]: 请统一使用简体中文输出所有分析与回答。`
      : `\n[RESPONSE LANGUAGE INSTRUCTION]: 請統一使用繁體中文輸出所有分析與回答。`;

    const modePersona =
      mode === 'critical-analysis'
        ? `\n[MODE PERSONA]: You are acting as a professional News Analyst & Critical Thinking Coach. Enforce rigorous evidence checks, explicit fact isolation, logic evaluation, and stakeholder analysis. Base all analysis strictly on active page content first.`
        : `\n[MODE PERSONA]: You are acting as a Fast Scan Reading Assistant. Keep outputs highly concise, structured with emojis, and focused on 30-second rapid comprehension.`;

    const systemMessage = `${contextFrame.systemGroundingPrompt}${modePersona}${langInstruction}\n\n${memoryContext}${webContext ? `\n\n${webContext}` : ''}`;

    const historyPayload: ChatMessagePayload[] = (request.historyMessages || [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const messages: ChatMessagePayload[] = [
      { role: 'system', content: systemMessage },
      ...historyPayload,
      { role: 'user', content: userQuery }
    ];

    return await adapter.generateStream({
      messages,
      signal: request.signal,
      onChunk: request.onChunk
    });
  }
}
