import React, { useState, useEffect, useRef } from 'react';
import { PageSnapshot } from '../../modules/page-capture/types';
import { ActionType, ChatMessage, AnalysisMode } from '../../modules/chat-orchestration/types';
import { ChatOrchestrator, isEnglishPage } from '../../modules/chat-orchestration/orchestrator';
import { ProviderConfig, loadSavedProviderConfig } from '../../modules/provider-adapter';
import { buildContextFrame } from '../../modules/context-pipeline';
import { MemoryStore } from '../../modules/memory/store';
import { SessionMemory } from '../../modules/memory/types';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { SelahIcon } from '../../components/SelahIcon';
import OptionsApp from '../options/OptionsApp';
import {
  FileText,
  CornerDownLeft,
  Settings,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  ArrowUpRight,
  ShieldCheck,
  Info,
  History,
  Trash2,
  X,
  ExternalLink
} from 'lucide-react';

export type StatusState = 'idle' | 'loading' | 'success' | 'error';
export type LanguageMode = 'auto' | 'zh-TW' | 'zh-CN' | 'en';


function executeScriptDOMExtraction(): PageSnapshot {
  const title = document.title || 'Untitled Page';
  const url = document.location?.href || '';
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = '';
  }

  const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';
  const selectionText = window.getSelection()?.toString().trim() || '';

  const headingElements = Array.from(document.querySelectorAll('h1, h2, h3'));
  const headings = headingElements
    .map(h => (h.textContent || '').trim())
    .filter(h => h.length > 0 && h.length < 150)
    .slice(0, 15);

  const candidateSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.markdown-body',
    '.entry-content',
    '.post-content',
    '.article-content',
    '#content',
    '.content',
    'body'
  ];

  let candidateTarget = 'body';
  let targetElement: Element | null = null;

  for (const selector of candidateSelectors) {
    const found = document.querySelector(selector);
    if (found && (found.textContent || '').trim().length > 100) {
      candidateTarget = selector;
      targetElement = found;
      break;
    }
  }

  if (!targetElement) {
    targetElement = document.body;
  }

  const container = targetElement ? (targetElement.cloneNode(true) as Element) : (document.body.cloneNode(true) as Element);
  const noiseSelectors = 'script, style, noscript, svg, iframe, nav, footer, header, form, button, input, select, textarea, [aria-hidden="true"], .nav, .footer, .sidebar, .comments';
  container.querySelectorAll(noiseSelectors).forEach(el => el.remove());

  const blockElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, td');
  let extractedLines: string[] = [];

  if (blockElements.length > 0) {
    blockElements.forEach(el => {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length > 0) {
        extractedLines.push(text);
      }
    });
  }

  let fullText = extractedLines.length > 0 ? extractedLines.join('\n\n') : '';
  if (!fullText || fullText.trim().length < 30) {
    const rawBodyText = (document.body?.innerText || container.textContent || '').replace(/\s+/g, ' ').trim();
    if (rawBodyText.length > fullText.length) {
      fullText = rawBodyText;
    }
  }
  fullText = fullText.trim();
  const characterCount = fullText.length;
  const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
  const isExtractedSuccessfully = characterCount >= 30;

  return {
    metadata: {
      title,
      url,
      domain,
      description: metaDesc,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    },
    fullText,
    selectionText,
    headings,
    candidateTarget,
    characterCount,
    wordCount,
    extractedAt: Date.now(),
    isExtractedSuccessfully
  };
}

export default function SidePanel() {
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [status, setStatus] = useState<StatusState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customInput, setCustomInput] = useState<string>('');
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('fast-scan');
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showMemoryInfo, setShowMemoryInfo] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [recentSessions, setRecentSessions] = useState<SessionMemory[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [responseLanguage, setResponseLanguage] = useState<LanguageMode>('auto');
  const [fontSizeScale, setFontSizeScale] = useState<'sm' | 'base' | 'lg'>('sm');

  const currentUrlRef = useRef<string>('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const memoryStore = new MemoryStore();

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['fontSizeScale'], (res) => {
        if (res.fontSizeScale && ['sm', 'base', 'lg'].includes(res.fontSizeScale)) {
          setFontSizeScale(res.fontSizeScale as any);
        }
      });
    }
  }, []);

  const handleCycleFontSize = () => {
    const nextScale: 'sm' | 'base' | 'lg' = fontSizeScale === 'sm' ? 'base' : fontSizeScale === 'base' ? 'lg' : 'sm';
    setFontSizeScale(nextScale);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ fontSizeScale: nextScale });
    }
  };

  const refreshProviderConfig = async () => {
    const cfg = await loadSavedProviderConfig();
    setProviderConfig(cfg);
  };

  const loadMemoryStoreData = async () => {
    const store = await memoryStore.getStore();
    setRecentSessions(store.sessions || []);
    if (store.profile?.language) {
      setResponseLanguage(store.profile.language as LanguageMode);
    }
  };

  const handleCycleLanguage = async () => {
    const sequence: LanguageMode[] = ['auto', 'en', 'zh-TW', 'zh-CN'];
    const currentIdx = sequence.indexOf(responseLanguage);
    const nextLang = sequence[(currentIdx + 1) % sequence.length];
    setResponseLanguage(nextLang);
    await memoryStore.updateProfile({ language: nextLang });
  };

  const handleResetSession = () => {
    setMessages([]);
    setStatus('idle');
    setErrorMessage('');
    setActiveAction(null);
    setEnableWebSearch(false);
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  };

  const fetchActiveTabContext = async () => {
    setLoadingContext(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        // Query all open tabs to accurately locate the user's active reading webpage tab
        // (This handles Desktop SidePanel, Mobile Popup, and iPad Full Tab environments)
        const allTabs = await chrome.tabs.query({});
        
        // Filter for actual webpage tabs (http:// or https://)
        const webTabs = allTabs.filter(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')));
        
        let tab: chrome.tabs.Tab | undefined;

        // 1. Try active webpage tab first
        tab = webTabs.find(t => t.active);

        // 2. If current active tab is extension/system tab (e.g. Action Popup or Options tab),
        // fallback to the most recent http/https webpage tab
        if (!tab && webTabs.length > 0) {
          tab = webTabs[webTabs.length - 1];
        }

        // 3. Fallback: try current window active tab if no http/https tab was found
        if (!tab) {
          const [currentWindowTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          tab = currentWindowTab;
        }

        if (!tab?.id) {
          throw new Error('[无法获取标签页] 当前活动标签页不可访问。');
        }

        if (tab.url) {
          currentUrlRef.current = tab.url;
        }

        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
          setSnapshot({
            metadata: {
              title: tab.title || 'System Page',
              url: tab.url || '',
              domain: 'system'
            },
            fullText: '',
            selectionText: '',
            headings: [],
            candidateTarget: 'system',
            characterCount: 0,
            wordCount: 0,
            extractedAt: Date.now(),
            isExtractedSuccessfully: false
          });
          setLoadingContext(false);
          return;
        }

        chrome.tabs.sendMessage(tab.id, { type: 'GET_ACTIVE_PAGE_CONTEXT' }, (res) => {
          if (chrome.runtime.lastError || !res?.data) {
            if (chrome.scripting) {
              chrome.scripting.executeScript(
                {
                  target: { tabId: tab.id! },
                  func: executeScriptDOMExtraction
                },
                (results) => {
                  if (chrome.runtime.lastError || !results?.[0]?.result) {
                    setSnapshot({
                      metadata: {
                        title: tab.title || 'Current Web Page',
                        url: tab.url || '',
                        domain: tab.url ? new URL(tab.url).hostname : 'web'
                      },
                      fullText: '',
                      selectionText: '',
                      headings: [],
                      candidateTarget: 'failed',
                      characterCount: 0,
                      wordCount: 0,
                      extractedAt: Date.now(),
                      isExtractedSuccessfully: false
                    });
                  } else {
                    setSnapshot(results[0].result as PageSnapshot);
                  }
                  setLoadingContext(false);
                }
              );
              return;
            }
          } else if (res?.success && res.data) {
            setSnapshot(res.data);
          }
          setLoadingContext(false);
        });
        return;
      }

      setSnapshot({
        metadata: {
          title: 'Demo Article: Understanding Privacy-First Web Assistants',
          url: 'https://example.com/privacy-ai',
          domain: 'example.com'
        },
        fullText: 'Privacy-first browser assistants process user data locally, avoiding unnecessary third-party tracking. By extracting DOM elements cleanly, the system grounds AI responses directly in page content without sending telemetry data.',
        selectionText: '',
        headings: ['Introduction', 'BYOK Models', 'Privacy Guarantees'],
        candidateTarget: 'article',
        characterCount: 236,
        wordCount: 38,
        extractedAt: Date.now(),
        isExtractedSuccessfully: true
      });
    } catch (err: any) {
      setErrorMessage(err?.message || '页面正文提取失败');
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    refreshProviderConfig();
    fetchActiveTabContext();
    loadMemoryStoreData();

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'local' && changes['pagefirst_provider_config']) {
          const newCfg = changes['pagefirst_provider_config'].newValue;
          setProviderConfig(newCfg);
          if (status === 'error' && errorMessage.includes('API Key')) {
            setStatus('idle');
            setErrorMessage('');
          }
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
        try {
          const tab = await chrome.tabs.get(activeInfo.tabId);
          if (tab?.url && tab.url !== currentUrlRef.current) {
            currentUrlRef.current = tab.url;
            handleResetSession();
            fetchActiveTabContext();
          }
        } catch {
          // ignore
        }
      };

      const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
        if (tab.active && changeInfo.status === 'complete' && tab.url && tab.url !== currentUrlRef.current) {
          currentUrlRef.current = tab.url;
          handleResetSession();
          fetchActiveTabContext();
        }
      };

      chrome.tabs.onActivated.addListener(handleTabActivated);
      chrome.tabs.onUpdated.addListener(handleTabUpdated);

      return () => {
        chrome.tabs.onActivated.removeListener(handleTabActivated);
        chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      };
    }
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleAction = async (actionType: ActionType, query?: string) => {
    if (!snapshot || !snapshot.isExtractedSuccessfully || snapshot.characterCount < 30) {
      setStatus('error');
      setErrorMessage(`[未成功读取页面正文] 当前页面未提取到有效正文内容 (只读到 ${snapshot?.characterCount || 0} 字符)。为避免假总结，已阻止分析。请刷新页面重试。`);
      return;
    }

    const currentConfig = await loadSavedProviderConfig();
    setProviderConfig(currentConfig);

    if (!currentConfig) {
      setStatus('error');
      setErrorMessage('[未配置 Provider] 尚未加载配置，请在 Settings 中配置 API Key 或本地模型。');
      return;
    }

    if (
      currentConfig.type === 'openai-compatible' &&
      !currentConfig.apiKey &&
      !currentConfig.baseUrl?.includes('localhost') &&
      !currentConfig.baseUrl?.includes('127.0.0.1')
    ) {
      setStatus('error');
      setErrorMessage('[未配置 API Key] 您选择了 OpenAI 兼容 Endpoint，但未检测到有效 API Key。请在 Settings ⚙️ 中保存 API Key。');
      return;
    }

    let userPromptText = query || '';
    if (!userPromptText) {
      const isENPage = snapshot?.fullText ? isEnglishPage(snapshot.fullText) : false;
      const isENPrompt = responseLanguage === 'en' || (responseLanguage === 'auto' && isENPage);
      const isTWPrompt = responseLanguage === 'zh-TW';

      switch (actionType) {
        case 'summarize':
          userPromptText = isENPrompt
            ? (analysisMode === 'critical-analysis' ? 'Analyze this report with 4-stage critical review framework' : 'Analyze active page text')
            : isTWPrompt
            ? (analysisMode === 'critical-analysis' ? '按 4 階段精讀邏輯拆解本報導' : '解析當前網頁正文')
            : (analysisMode === 'critical-analysis' ? '按 4 阶段精读逻辑拆解本报道' : '解析当前网页正文');
          break;
        case 'analyze-insights':
          userPromptText = isENPrompt
            ? 'Perform deep logical breakdown & critical insight on this page'
            : isTWPrompt
            ? '深度分析本文的核心立論、隱含假設與落地啟示'
            : '深度分析本文的核心立论、隐含假设与落地启示';
          break;
        case 'extract-facts':
          userPromptText = isENPrompt
            ? 'Extract 5W1H facts matrix, key metrics and dates'
            : isTWPrompt
            ? '提取本文的關鍵數據、日期、實體與 5W1H 事實矩陣'
            : '提取本文的关键数据、日期、实体与 5W1H 事实矩阵';
          break;
        case 'ask-document':
          userPromptText = isENPrompt ? 'Ask interactive questions about this page' : isTWPrompt ? '圍繞當前網頁進行互動式深度問答' : '围绕当前网页进行交互式深度问答';
          break;
        default:
          userPromptText = isENPrompt ? 'Analyze this web page' : isTWPrompt ? '分析這篇網頁' : '分析这篇网页';
      }
    }

    const userMessageId = `usr_${Date.now()}`;
    const assistantMessageId = `ast_${Date.now()}`;

    const isWebSearchAction = enableWebSearch && actionType !== 'summarize' && actionType !== 'extract-facts' && actionType !== 'analyze-insights';

    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userPromptText,
      timestamp: Date.now(),
      actionType
    };

    const newAssistantMsg: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      actionType,
      groundedInPage: true,
      usedWebSearch: isWebSearchAction
    };

    const previousHistory = [...messages];
    const currentMessagesPayload = [...previousHistory, newUserMsg, newAssistantMsg];

    setMessages(currentMessagesPayload);
    setActiveAction(actionType);
    setStatus('loading');
    setErrorMessage('');

    try {
      const orchestrator = new ChatOrchestrator();
      const finalContent = await orchestrator.runAction({
        actionType,
        analysisMode,
        responseLanguage,
        customQuery: query,
        enableWebSearch: isWebSearchAction,
        historyMessages: previousHistory,
        snapshot,
        providerConfig: currentConfig,
        onChunk: (chunk) => {
          setStatus('success');
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        }
      });

      const updatedAssistantMsg = { ...newAssistantMsg, content: finalContent || '' };
      const finalMessagesList = [...previousHistory, newUserMsg, updatedAssistantMsg];

      if (finalContent) {
        setMessages(finalMessagesList);
      }

      await memoryStore.addOrUpdateSession({
        sessionId,
        url: snapshot.metadata.url,
        pageTitle: snapshot.metadata.title,
        chatSummary: userPromptText.slice(0, 60),
        messages: finalMessagesList,
        lastTimestamp: Date.now()
      });
      loadMemoryStoreData();

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || '请求 API / 模型时发生错误。');
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
    }
  };

  const handleSelectSession = (s: SessionMemory) => {
    if (s.messages && s.messages.length > 0) {
      setMessages(s.messages);
      setSessionId(s.sessionId);
      setStatus('success');
      setShowHistoryModal(false);
    }
  };

  const handleDeleteSessionItem = async (sid: string) => {
    await memoryStore.deleteSession(sid);
    loadMemoryStoreData();
  };

  const handleOpenOptions = () => {
    setShowSettingsModal(true);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isKeyConfigured = Boolean(
    providerConfig?.type === 'ollama' ||
    providerConfig?.type === 'chrome-ai' ||
    (providerConfig?.apiKey && providerConfig.apiKey.trim().length > 0)
  );

  const getLangBadgeText = (mode: LanguageMode) => {
    switch (mode) {
      case 'en':
        return '[ EN ]';
      case 'zh-TW':
        return '[ 繁 ]';
      case 'zh-CN':
        return '[ 简 ]';
      default:
        return '[ AUTO ]';
    }
  };

  const getActionBadgeLabel = (actionType?: ActionType, index?: number, usedWebSearch?: boolean) => {
    if (usedWebSearch) {
      return '[ PROVENANCE // PAGE_DOM + WEB_SEARCH ]';
    }
    switch (actionType) {
      case 'summarize':
        return '[ PROVENANCE // PAGE_ANALYSIS ]';
      case 'analyze-insights':
        return '[ PROVENANCE // LOGIC_AND_DATA ]';
      case 'extract-facts':
        return '[ PROVENANCE // 5W1H_FACTS ]';
      case 'ask-document':
        return '[ PROVENANCE // PAGE_PROBE ]';
      default:
        return index && index > 1 ? `[ PROVENANCE // PROBE_TURN_${Math.ceil(index / 2)} ]` : '[ PROVENANCE // PAGE_GROUNDED ]';
    }
  };

  const renderTrustBadge = (actionType?: ActionType, usedWebSearch?: boolean) => {
    if (usedWebSearch) {
      return (
        <span className="text-sky-400 font-medium flex items-center gap-1 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" /> PAGE + WEB
        </span>
      );
    }
    if (analysisMode === 'critical-analysis') {
      return (
        <span className="text-sky-400 font-medium flex items-center gap-1 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" /> CRITICAL
        </span>
      );
    }
    return (
      <span className="text-emerald-400 font-medium flex items-center gap-1 font-mono text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /> 100% GROUNDED
      </span>
    );
  };

  const isENPage = snapshot?.fullText ? isEnglishPage(snapshot.fullText) : false;
  const isEN = responseLanguage === 'en' || (responseLanguage === 'auto' && isENPage);
  const isTW = responseLanguage === 'zh-TW';
  const isCN = responseLanguage === 'zh-CN' || (!isEN && !isTW);

  return (
    <div className="flex flex-col h-screen w-full bg-[#070A0F] text-slate-100 selection:bg-indigo-500 selection:text-white font-sans overflow-hidden relative">
      {/* FULL-DRAWER SETTINGS OVERLAY WITH FIXED INSET & FLEX CONTAINER */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-[#070A0F] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
          <OptionsApp
            responseLanguage={responseLanguage}
            onClose={() => {
              setShowSettingsModal(false);
              refreshProviderConfig();
              loadMemoryStoreData();
            }}
          />
        </div>
      )}

      {/* 1. SIGNATURE RESPONSIVE HEADER */}
      <header className="px-3 py-2.5 sm:px-3.5 border-b border-[#1E2634] bg-[#070A0F] flex items-center justify-between shrink-0 gap-1.5 z-10">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#0F141C] border border-[#1E2634] flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <SelahIcon size={14} className="text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-xs font-bold tracking-tight text-white font-sans truncate">Selah PageFirst</h1>
              <span className="text-[9px] text-sky-400 font-mono font-bold bg-sky-950/80 px-1 py-0.2 rounded border border-sky-800/60 shrink-0">v1.1.2</span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono truncate">
              Selah Reading Tools • Page-First AI Assistant • by postsoma-2050
            </p>
          </div>
        </div>

        {/* Integrated Responsive Control Slot Tray */}
        <div className="bg-[#0F141C] border border-[#1E2634] p-0.5 rounded-lg flex items-center gap-0.5 shadow-inner shrink-0">
          <button
            onClick={handleCycleLanguage}
            title={`Current Language: ${responseLanguage.toUpperCase()}. Click to cycle (Auto -> EN -> 繁 -> 简)`}
            className="px-1.5 sm:px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 active:scale-95 shrink-0"
          >
            <span>{getLangBadgeText(responseLanguage)}</span>
          </button>

          <span className="w-[1px] h-3 bg-[#1E2634]" />

          <button
            onClick={handleCycleFontSize}
            title={`Font Size: ${fontSizeScale === 'sm' ? 'Small (13px)' : fontSizeScale === 'base' ? 'Medium (15px)' : 'Large (17px)'}. Click to cycle (A⁻ -> A -> A⁺)`}
            className="px-1.5 sm:px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 active:scale-95 shrink-0"
          >
            <span>{fontSizeScale === 'sm' ? '[ A⁻ ]' : fontSizeScale === 'base' ? '[ A ]' : '[ A⁺ ]'}</span>
          </button>

          <span className="w-[1px] h-3 bg-[#1E2634]" />

          <button
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            title="View Recent Session Memories"
            className={`p-1.5 rounded transition active:scale-95 ${showHistoryModal ? 'bg-slate-800 text-sky-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          >
            <History className="w-3.5 h-3.5" />
          </button>

          <span className="w-[1px] h-3 bg-[#1E2634]" />

          {messages.length > 0 && (
            <>
              <button
                onClick={handleResetSession}
                title="Reset Session"
                className="p-1.5 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition flex items-center gap-1 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400/90" />
              </button>
              <span className="w-[1px] h-3 bg-[#1E2634]" />
            </>
          )}

          <button
            onClick={fetchActiveTabContext}
            title="Refresh Page Context"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingContext ? 'animate-spin' : ''}`} />
          </button>

          <span className="w-[1px] h-3 bg-[#1E2634]" />

          <button
            onClick={handleOpenOptions}
            title="Settings & Workbench"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition relative active:scale-95"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            {!isKeyConfigured && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <span className="w-[1px] h-3 bg-[#1E2634]" />

          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            title="Toggle Diagnostics"
            className="p-1.5 rounded text-slate-600 hover:text-slate-400 hover:bg-slate-800/40 transition active:scale-95"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* 2. Active Tab Context Bar */}
      <div className="px-3 py-1.5 sm:px-3.5 bg-[#0F141C]/50 border-b border-[#1E2634] flex items-center justify-between text-xs text-slate-400 shrink-0 gap-1 z-10">
        <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
          <FileText className="w-3.5 h-3.5 text-sky-400/90 shrink-0" />
          <span className="font-medium text-slate-200 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none" title={snapshot?.metadata.title}>
            {loadingContext ? (isEN ? 'Reading active tab...' : '读取活动标签页中...') : snapshot?.metadata.title || (isEN ? 'No active page' : '当前无活动网页')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
          <span className={`px-1.5 py-0.5 rounded transition ${
            snapshot?.isExtractedSuccessfully
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
              : 'bg-slate-900 text-slate-400 border border-[#1E2634]'
          }`}>
            {snapshot?.isExtractedSuccessfully
              ? `${snapshot.characterCount} chars`
              : `0 chars`}
          </span>
        </div>
      </div>

      {/* 3. MODE SWITCHER SEGMENTED CONTROL */}
      <div className="px-3 py-1.5 bg-[#0F141C]/80 border-b border-[#1E2634] flex items-center justify-between shrink-0 text-xs z-10">
        <div className="flex items-center p-0.5 bg-[#070A0F] rounded-lg border border-[#1E2634] w-full">
          <button
            onClick={() => setAnalysisMode('fast-scan')}
            className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.99] ${
              analysisMode === 'fast-scan'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="font-mono text-[10px] tracking-wider font-bold">{isEN ? '[ 30S FAST SCAN ]' : '[ 30S 快速扫描 ]'}</span>
          </button>

          <button
            onClick={() => setAnalysisMode('critical-analysis')}
            className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.99] ${
              analysisMode === 'critical-analysis'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="font-mono text-[10px] tracking-wider font-bold">{isEN ? '[ 4STAGE CRITICAL ]' : '[ 4阶段 新闻精读 ]'}</span>
          </button>
        </div>
      </div>

      {/* RECENT SESSIONS HISTORY MODAL */}
      {showHistoryModal && (
        <div className="p-3 bg-[#0F141C]/95 border-b border-[#1E2634] text-xs text-slate-200 space-y-2.5 shrink-0 animate-in slide-in-from-top-2 z-20">
          <div className="flex items-center justify-between border-b border-[#1E2634] pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sky-400 flex items-center gap-1 text-xs uppercase tracking-wider font-mono">
                <History className="w-3.5 h-3.5" /> Recent Page Session Memories ({recentSessions.length})
              </span>
              <button
                onClick={() => setShowMemoryInfo(!showMemoryInfo)}
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono border transition flex items-center gap-1 ${
                  showMemoryInfo
                    ? 'bg-sky-950 text-sky-300 border-sky-700'
                    : 'bg-[#070A0F] text-slate-400 border-[#1E2634] hover:text-sky-300'
                }`}
                title={isEN ? "View Memory Policy Notice" : "查看 Memory 记忆存储规则说明"}
              >
                <span>!</span>
                <span>{isEN ? 'Policy' : responseLanguage === 'zh-TW' ? '規則' : '规则'}</span>
              </button>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* DYNAMICALLY BILINGUAL MEMORY POLICY NOTICE */}
          {showMemoryInfo && (
            <div className="p-2.5 rounded-lg bg-[#070A0F] border border-sky-800/40 text-[11px] space-y-1.5 font-sans leading-relaxed animate-in fade-in-50">
              <div className="flex items-center justify-between border-b border-[#1E2634] pb-1">
                <span className="font-mono font-bold text-sky-300 text-[10px] tracking-wider flex items-center gap-1">
                  <Info className="w-3 h-3 text-sky-400" /> [ MEMORY_POLICY_NOTICE ]
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">100% LOCAL</span>
              </div>
              {isEN ? (
                <ul className="space-y-1 text-slate-300 text-[10px] list-disc list-inside">
                  <li><strong className="text-white">Data Privacy:</strong> All memories stored 100% locally in your `chrome.storage.local`. Never uploaded to remote servers.</li>
                  <li><strong className="text-white">Dynamic Limit:</strong> Auto-retains last <strong className="text-sky-300">20 active sessions</strong> (FIFO auto-eviction). Profile & topics stored permanently.</li>
                  <li><strong className="text-white">Manual Control:</strong> Click <Trash2 className="w-2.5 h-2.5 inline text-rose-400" /> to delete single session, or clear all anytime in Settings.</li>
                </ul>
              ) : responseLanguage === 'zh-TW' ? (
                <ul className="space-y-1 text-slate-300 text-[10px] list-disc list-inside">
                  <li><strong className="text-white">數據隱私：</strong>所有記憶只存在您本地 `chrome.storage.local`，絕不上傳遠程服務器。</li>
                  <li><strong className="text-white">動態保存上限：</strong>會話記憶最多自動保留最近 <strong className="text-sky-300">20 條</strong>，超額自動淘汰舊記錄 (FIFO)；偏好與知識點永久保留。</li>
                  <li><strong className="text-white">手動控制與擦除：</strong>點擊下方 <Trash2 className="w-2.5 h-2.5 inline text-rose-400" /> 可單條刪除；也可在 Settings 中隨時一鍵徹底清空。</li>
                </ul>
              ) : (
                <ul className="space-y-1 text-slate-300 text-[10px] list-disc list-inside">
                  <li><strong className="text-white">数据隐私：</strong>所有记忆只存在您本地 `chrome.storage.local`，绝不上传远程服务器。</li>
                  <li><strong className="text-white">动态保存上限：</strong>会话记忆最多自动保留最近 <strong className="text-sky-300">20 条</strong>，超额自动淘汰旧记录 (FIFO)；偏好与知识点永久保留。</li>
                  <li><strong className="text-white">手动控制与擦除：</strong>点击下方 <Trash2 className="w-2.5 h-2.5 inline text-rose-400" /> 可单条删除；也可在 Settings 中随时一键彻底清空。</li>
                </ul>
              )}
            </div>
          )}

          <div className="space-y-1.5 max-h-48 overflow-y-auto touch-scroll touch-pan-y">
            {recentSessions.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic text-center py-2">No recent session memories found.</p>
            ) : (
              recentSessions.map((s) => (
                <div
                  key={s.sessionId}
                  onClick={() => handleSelectSession(s)}
                  className="p-2 bg-[#070A0F] hover:bg-slate-900 rounded-lg border border-[#1E2634] hover:border-slate-700 flex items-center justify-between text-[11px] cursor-pointer transition group"
                >
                  <div className="truncate pr-2 flex-1 min-w-0">
                    <span className="font-semibold text-slate-200 group-hover:text-sky-300 transition block truncate">{s.pageTitle}</span>
                    <span className="text-slate-500 text-[10px] block truncate">{s.chatSummary || s.url}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSessionItem(s.sessionId);
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition shrink-0 active:scale-95"
                    title="Delete session memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* DEV DEBUG INSPECTION PANEL */}
      {showDebugPanel && (
        <div className="p-3 bg-[#0F141C]/90 border-b border-[#1E2634] text-[11px] font-mono space-y-2 text-slate-300 shrink-0 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-[#1E2634] pb-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Session Diagnostics (V1.1)</span>
            <span>ID: {sessionId.slice(0, 12)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#070A0F] p-2 rounded border border-[#1E2634]">
              <span className="text-slate-500 block">Active Mode</span>
              <span className="text-amber-400 font-semibold">{analysisMode}</span>
            </div>
            <div className="bg-[#070A0F] p-2 rounded border border-[#1E2634]">
              <span className="text-slate-500 block">Target Selector</span>
              <span className="text-slate-300 font-semibold">{snapshot?.candidateTarget || 'none'}</span>
            </div>
            <div className="bg-[#070A0F] p-2 rounded border border-[#1E2634]">
              <span className="text-slate-500 block">Raw Body Length</span>
              <span className="text-slate-300 font-semibold">{snapshot?.characterCount || 0} chars</span>
            </div>
            <div className="bg-[#070A0F] p-2 rounded border border-[#1E2634]">
              <span className="text-slate-500 block">Output Language</span>
              <span className="text-sky-400 font-bold">{responseLanguage.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. SIGNATURE PRIMARY CTA & STRUCTURAL PROBE INDICES */}
      <div className="p-2.5 border-b border-[#1E2634] bg-[#0F141C]/40 space-y-2 shrink-0 z-10">
        {analysisMode === 'fast-scan' ? (
          <>
            {/* Primary CTA */}
            <button
              onClick={() => handleAction('summarize')}
              disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
              className="w-full py-2.5 px-3.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold shadow-md flex items-center justify-between transition-all duration-150 active:translate-y-[1px] active:scale-[0.99] disabled:opacity-50 group min-h-[38px]"
            >
              <span>{isEN ? 'Analyze Active Page Text' : '解析当前网页正文'}</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 text-white text-[11px] font-mono border border-slate-800 flex items-center justify-center gap-1 group-hover:border-slate-600 transition">
                <span className="text-[10px]">EXECUTE</span>
                <ArrowUpRight className="w-3 h-3 text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </button>

            {/* Signature Structural Probe Indices */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-sans">
              <button
                onClick={() => handleAction('custom-query', isEN ? '1. Summarize deep structure notes & key logic' : isTW ? '1. 請整理本文的深度筆記 (詳細結構與邏輯拆解)' : '1. 请整理本文的深度笔记 (详细结构与逻辑拆解)')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">01</span>
                <span className="truncate min-w-0">{isEN ? 'Deep Notes' : isTW ? '深度筆記' : '深度笔记'}</span>
              </button>
              <button
                onClick={() => handleAction('custom-query', isEN ? '2. Analyze critical perspective & blind spots' : isTW ? '2. 請分析本文的批判視角 (反對意見與盲點剖析)' : '2. 请分析本文的批判视角 (反对意见与盲点剖析)')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">02</span>
                <span className="truncate min-w-0">{isEN ? 'Critical View' : isTW ? '批判視角' : '批判视角'}</span>
              </button>
              <button
                onClick={() => handleAction('custom-query', isEN ? '3. Extract practical applications for life/work' : isTW ? '3. 請總結本文的實用轉化 (如何應用到生活/工作)' : '3. 请总结本文的实用转化 (如何应用到生活/工作)')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">03</span>
                <span className="truncate min-w-0">{isEN ? 'Practical Uses' : isTW ? '實用轉化' : '实用转化'}</span>
              </button>
              <button
                onClick={() => handleAction('custom-query', isEN ? '4. Explain specialized terminology & glossary' : isTW ? '4. 請解釋本文的專有名詞與術語' : '4. 请解释本文的专业名词与术语')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">04</span>
                <span className="truncate min-w-0">{isEN ? 'Key Terms' : isTW ? '術語解釋' : '术语解释'}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => handleAction('summarize')}
              disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
              className="w-full py-2.5 px-3.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold shadow-md flex items-center justify-between transition-all duration-150 active:translate-y-[1px] active:scale-[0.99] disabled:opacity-50 group min-h-[38px]"
            >
              <span>{isEN ? 'Start 4-Stage Critical Review' : '启动 4 阶段新闻精读'}</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 text-white text-[11px] font-mono border border-slate-800 flex items-center justify-center gap-1 group-hover:border-slate-600 transition">
                <span className="text-[10px]">EXECUTE</span>
                <ArrowUpRight className="w-3 h-3 text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </button>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-sans">
              <button
                onClick={() => handleAction('extract-facts')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">01</span>
                <span className="truncate min-w-0">{isEN ? '5W1H Facts' : '5W1H 事实'}</span>
              </button>
              <button
                onClick={() => handleAction('analyze-insights')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">02</span>
                <span className="truncate min-w-0">{isEN ? 'Logic & Data' : '逻辑与数据'}</span>
              </button>
              <button
                onClick={() => handleAction('custom-query', isEN ? 'Write a 2-3 sentence concise rephrased summary' : '请用你自己的话对这篇报道做一段 2-3 句话的精炼短摘要。')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">03</span>
                <span className="truncate min-w-0">{isEN ? 'Synthesis' : '重述摘要'}</span>
              </button>
              <button
                onClick={() => handleAction('custom-query', isEN ? 'Analyze reporting sources, underlying bias, and omitted voices' : '请分析本文消息来源、潜在立场偏向与缺席的利害关系人声音。')}
                disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
                className="py-1.5 px-2 bg-[#0F141C] hover:bg-slate-800 border border-[#1E2634] hover:border-slate-700 border-l-2 border-l-sky-500/80 rounded-r-lg text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] group min-w-0"
              >
                <span className="font-mono text-slate-400 font-bold text-xs group-hover:text-sky-300 transition shrink-0">04</span>
                <span className="truncate min-w-0">{isEN ? 'Standpoint' : '立场与盲点'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 5. CONTINUOUS READING DOCUMENT SCROLL */}
      <main
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3 min-h-0"
      >
        {/* CAPTURED DOCUMENT WORKSPACE CARD */}
        {messages.length === 0 && status === 'idle' && (
          <div className="p-4 rounded-xl bg-[#0F141C] border border-[#1E2634] space-y-3 text-center shadow-lg">
            <div className="relative w-12 h-12 rounded-xl bg-[#070A0F] border border-[#1E2634] flex items-center justify-center mx-auto text-sky-400 shadow-inner group">
              <SelahIcon size={24} className="text-sky-400" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-emerald-400/90 uppercase tracking-wider block font-bold">
                [ PAGE_LOCKED // READ_READY ]
              </span>
              <h2 className="text-xs font-bold text-white tracking-tight line-clamp-2">
                “{snapshot?.metadata.title || (isEN ? 'Active Page Workspace' : '当前网页正文工作区')}”
              </h2>
              <div className="text-[11px] text-slate-300 leading-relaxed pt-1.5 space-y-1 font-sans">
                {snapshot?.isExtractedSuccessfully ? (
                  <>
                    <p className="font-semibold text-emerald-400">
                      ✓ {isEN ? `Page Captured Successfully (${snapshot.characterCount} chars / <${snapshot.candidateTarget}>)` : `正文已抓取成功（${snapshot.characterCount} chars / <${snapshot.candidateTarget}>）`}
                    </p>
                    <p className="text-slate-400 text-[10px] font-mono">
                      {isEN ? 'AI Analysis Available. Click [EXECUTE ↗] button above to begin.' : 'AI 分析已就绪，点击上方主按键 [EXECUTE ↗] 启动解析。'}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400">
                    {isEN ? 'Current page contains no main article body. Switch to an article page to enable.' : '当前页面包含非文字主体内容（如搜索引擎/空白页）。切换至包含长正文的网页即可自动启用。'}
                  </p>
                )}
              </div>
            </div>

            {snapshot?.isExtractedSuccessfully && (
              <div className="pt-1.5 border-t border-[#1E2634]/60 text-[10px] font-mono text-sky-400/90 flex items-center justify-center gap-1">
                <span>↑ {isEN ? 'Click [EXECUTE ↗] button above to launch analysis' : '点击上方主按键 [EXECUTE ↗] 启动解析'}</span>
              </div>
            )}
          </div>
        )}

        {/* CONTINUOUS READING DOCUMENT SCROLL */}
        {messages.map((msg, index) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === 'user' ? (
              <div className="pt-2 pb-1 border-b border-[#1E2634] flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  <span className="break-words">{msg.content}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  PROBE #{Math.ceil((index + 1) / 2)}
                </span>
              </div>
            ) : (
              <div className={`p-3.5 rounded-xl bg-[#0F141C] border border-[#1E2634] text-xs text-slate-200 leading-relaxed space-y-2.5 shadow-md ${
                msg.usedWebSearch ? 'border-l-2 border-l-sky-500' : 'border-l-2 border-l-emerald-500'
              }`}>
                {/* Top Provenance Header Slot */}
                <div className="flex items-center justify-between border-b border-[#1E2634] pb-2 text-[10px]">
                  <span className="font-bold text-slate-300 font-mono tracking-wider truncate max-w-[200px]">
                    {getActionBadgeLabel(msg.actionType, index, msg.usedWebSearch)}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {renderTrustBadge(msg.actionType, msg.usedWebSearch)}
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition active:scale-95"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Grounding Source Info Tag */}
                <div className="px-2 py-1 bg-[#070A0F] rounded border border-[#1E2634] text-[10px] text-slate-400 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1 text-slate-300 truncate pr-1">
                    <Info className="w-3 h-3 text-sky-400 shrink-0" />
                    {msg.usedWebSearch
                      ? 'Source: Active Page + Web Search Results'
                      : index > 1
                      ? `Context: Page Body + ${Math.floor(index / 2)} History Turns`
                      : `Source: <${snapshot?.candidateTarget}> (${snapshot?.characterCount || 0} chars)`}
                  </span>
                  <span className="text-slate-500 text-[9px] shrink-0">{snapshot?.metadata.domain}</span>
                </div>

                {/* Render Message Body */}
                <div className="pt-0.5">
                  {msg.content ? (
                    <MarkdownRenderer content={msg.content} fontSizeScale={fontSizeScale} />
                  ) : status === 'loading' ? (
                    <span className="text-slate-400 italic text-xs animate-pulse font-mono">Generating analysis document...</span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}

        {status === 'loading' && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0F141C] border border-[#1E2634] text-xs text-sky-300 animate-pulse font-mono">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-sky-400" />
            <span>Analyzing page context and generating document...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-2.5 text-xs text-rose-200">
            <div className="flex items-center gap-2 font-bold text-rose-300 border-b border-rose-900/60 pb-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{isEN ? 'Request Failed / Execution Error' : '请求失败 / 无法完成闭环'}</span>
            </div>

            <p className="leading-relaxed text-[11px] whitespace-pre-wrap font-mono bg-rose-950/60 p-2.5 rounded-lg border border-rose-900/40 text-rose-200">
              {errorMessage}
            </p>

            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={handleOpenOptions}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-900/60 hover:bg-rose-900 text-rose-100 font-medium rounded-md text-[11px] transition active:scale-95"
              >
                <Settings className="w-3 h-3" />
                <span>前往 Settings 检查</span>
              </button>
              <button
                onClick={() => fetchActiveTabContext()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] transition flex items-center gap-1 active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                <span>重新抓取</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 6. Custom Query Input Footer (Android & iOS Virtual Keyboard Avoidance Engine) */}
      <footer className="p-3 border-t border-[#1E2634] bg-[#0F141C]/90 backdrop-blur-md shrink-0 space-y-2 safe-pb z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customInput.trim()) {
              handleAction('custom-query', customInput);
              setCustomInput('');
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={isEN ? "Ask questions about this page..." : (analysisMode === 'critical-analysis' ? "追问消息来源、逻辑推演或立场盲点..." : "围绕当前页面提问 (Ask about this page)...")}
            disabled={status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
            className="flex-1 bg-[#070A0F] border border-[#1E2634] focus:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition disabled:opacity-50 font-sans min-h-[38px]"
          />
          <button
            type="submit"
            title="Probe Page Context (↵)"
            disabled={!customInput.trim() || status === 'loading' || loadingContext || !snapshot?.isExtractedSuccessfully}
            className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 transition disabled:opacity-40 shrink-0 active:scale-95 font-bold font-mono text-[11px] min-h-[38px] flex items-center justify-center gap-1 shadow-sm"
          >
            <span>PROBE</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 font-mono">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableWebSearch}
              onChange={(e) => setEnableWebSearch(e.target.checked)}
              className="rounded border-[#1E2634] bg-[#070A0F] text-sky-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className={enableWebSearch ? 'text-sky-400 font-medium font-mono text-[10px]' : 'text-slate-400 font-mono text-[10px]'}>
              [ WEB_SEARCH ] Enable Conditional Web Search
            </span>
          </label>
          <span className="text-[10px] text-slate-500">[ PAGE_ONLY ]</span>
        </div>
      </footer>
    </div>
  );
}
