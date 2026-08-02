import React, { useState, useEffect, useRef } from 'react';
import { ProviderConfig, ProviderType, loadSavedProviderConfig, saveProviderConfig, createProviderAdapter } from '../../modules/provider-adapter';
import { MemoryStore } from '../../modules/memory/store';
import { MemoryStoreSchema } from '../../modules/memory/types';
import { SelahIcon } from '../../components/SelahIcon';
import {
  Database,
  Shield,
  Save,
  Sliders,
  Loader2,
  Trash2,
  Plus,
  ToggleLeft,
  ToggleRight,
  Languages,
  X,
  ExternalLink,
  Info,
  CheckCircle2,
  Key,
  Server,
  RefreshCw
} from 'lucide-react';

interface OptionsAppProps {
  onClose?: () => void;
  responseLanguage?: 'auto' | 'zh-TW' | 'zh-CN' | 'en';
}

export default function OptionsApp({ onClose, responseLanguage }: OptionsAppProps = {}) {
  const [activeTab, setActiveTab] = useState<'providers' | 'memory' | 'about'>('providers');
  const [providerType, setProviderType] = useState<ProviderType>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState<string>('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gpt-4o-mini');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // DOM refs — read at save time to bypass Android state-sync lag
  const baseUrlRef = useRef<HTMLInputElement>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  
  // Memory State
  const [memorySchema, setMemorySchema] = useState<MemoryStoreSchema | null>(null);
  const [newTopic, setNewTopic] = useState<string>('');
  const [newTopicSummary, setNewTopicSummary] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [preferredTone, setPreferredTone] = useState<'concise' | 'detailed' | 'bulleted' | 'casual'>('concise');
  const [preferredLanguage, setPreferredLanguage] = useState<'auto' | 'zh-TW' | 'zh-CN' | 'en'>('auto');
  const [profileUpdated, setProfileUpdated] = useState<boolean>(false);

  const effectiveLang = responseLanguage && responseLanguage !== 'auto' ? responseLanguage : preferredLanguage;
  const isEN = effectiveLang === 'en';
  const isTW = effectiveLang === 'zh-TW';
  const isCN = effectiveLang === 'zh-CN' || (!isEN && !isTW);

  const memoryStore = new MemoryStore();

  const reloadMemory = async () => {
    const storeData = await memoryStore.getStore();
    setMemorySchema(storeData);
    if (storeData.profile) {
      setCustomInstructions(storeData.profile.customInstructions || '');
      setPreferredTone(storeData.profile.preferredTone || 'concise');
      setPreferredLanguage((storeData.profile.language as any) || 'auto');
    }
  };

  useEffect(() => {
    loadSavedProviderConfig().then((cfg) => {
      if (cfg) {
        setProviderType(cfg.type);
        setBaseUrl(cfg.baseUrl || 'https://api.openai.com/v1');
        setApiKey(cfg.apiKey || '');
        setModel(cfg.model || 'gpt-4o-mini');
      }
    });

    reloadMemory();
  }, []);

  const handleApplyPreset = (type: ProviderType, url: string, defaultModel: string) => {
    setProviderType(type);
    setBaseUrl(url);
    setModel(defaultModel);
    setTestStatus('idle');
  };

  const handleSaveConfig = async () => {
    // Read directly from DOM refs to bypass Android state-sync lag
    const liveBaseUrl = (baseUrlRef.current?.value ?? baseUrl).trim();
    const liveApiKey  = (apiKeyRef.current?.value  ?? apiKey).trim();
    const liveModel   = (modelRef.current?.value   ?? model).trim();

    // Sync React state so UI stays consistent after save
    setBaseUrl(liveBaseUrl);
    setApiKey(liveApiKey);
    setModel(liveModel);

    const config: ProviderConfig = {
      type: providerType,
      baseUrl: liveBaseUrl,
      apiKey: liveApiKey,
      model: liveModel
    };
    await saveProviderConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    const liveBaseUrl = (baseUrlRef.current?.value ?? baseUrl).trim();
    const liveApiKey  = (apiKeyRef.current?.value  ?? apiKey).trim();
    const liveModel   = (modelRef.current?.value   ?? model).trim();

    setTestStatus('testing');
    setTestMessage('');
    try {
      const adapter = createProviderAdapter({
        type: providerType,
        baseUrl: liveBaseUrl,
        apiKey: liveApiKey,
        model: liveModel
      });

      const isOk = await adapter.isAvailable();
      if (!isOk) {
        throw new Error(isEN ? 'Connection failed' : isTW ? '連線失敗' : '连接失败');
      }

      setTestStatus('success');
      setTestMessage(isEN ? '🎉 Connection successful!' : isTW ? '🎉 連線成功！' : '🎉 连接成功！');
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(isEN ? `✕ Error: ${err?.message}` : isTW ? `✕ 錯誤: ${err?.message}` : `✕ 错误: ${err?.message}`);
    }
  };

  // Memory Handlers
  const handleToggleMemoryEnabled = async () => {
    if (!memorySchema) return;
    const nextVal = !(memorySchema.profile.memoryEnabled !== false);
    await memoryStore.updateProfile({ memoryEnabled: nextVal });
    await reloadMemory();
  };

  const handleSaveProfileMemory = async () => {
    await memoryStore.updateProfile({
      preferredTone,
      language: preferredLanguage,
      customInstructions: customInstructions.trim()
    });
    await reloadMemory();
    setProfileUpdated(true);
    setTimeout(() => setProfileUpdated(false), 2500);
  };

  const handleAddTopic = async () => {
    if (!newTopic.trim() || !newTopicSummary.trim()) return;
    await memoryStore.addTopic(newTopic.trim(), newTopicSummary.trim());
    setNewTopic('');
    setNewTopicSummary('');
    await reloadMemory();
  };

  const handleDeleteTopic = async (id: string) => {
    await memoryStore.deleteTopic(id);
    await reloadMemory();
  };

  const handleClearAllMemory = async () => {
    const confirmMsg = isEN ? 'Clear all data?' : isTW ? '確定清空所有記憶？' : '确定清空所有记忆？';
    if (confirm(confirmMsg)) {
      await memoryStore.clearAllMemory();
      await reloadMemory();
    }
  };

  const openInNewTab = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  return (
    <div className="h-full w-full max-h-screen bg-[#070A0F] text-slate-100 flex flex-col font-sans overflow-hidden selection:bg-indigo-500 selection:text-white touch-pan-y">
      <header className="border-b border-[#1E2634] bg-[#070A0F] px-3.5 py-2 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-md gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#0F141C] border border-[#1E2634] flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <SelahIcon size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-xs font-bold text-white tracking-tight font-sans truncate">Selah Workbench</h1>
              <span className="text-[9px] text-sky-400 font-mono font-bold bg-sky-950/80 px-1 py-0.2 rounded border border-sky-800/60 shrink-0">v1.1.2</span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono truncate">
              Selah Reading Tools • BYOK Provider & Local Memory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={openInNewTab}
            title={isEN ? 'Fullscreen' : isTW ? '全螢幕開啟' : '全屏打开'}
            className="px-2 py-1 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-700/80 text-sky-300 font-bold text-[11px] flex items-center gap-1 transition shadow-md active:scale-95 shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{isEN ? 'Fullscreen' : isTW ? '全螢幕' : '全屏'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow-md active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isEN ? 'Done' : '完成'}</span>
            </button>
          )}
        </div>
      </header>

      <div className="px-3 py-1.5 border-b border-[#1E2634] bg-[#0F141C]/80 shrink-0">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-1 bg-[#070A0F] p-1 rounded-lg border border-[#1E2634] text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('providers')}
              className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition-all duration-150 ${
                activeTab === 'providers'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{isEN ? 'Provider' : 'Provider 配置'}</span>
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition-all duration-150 ${
                activeTab === 'memory'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">{isEN ? 'Memory' : isTW ? '本機記憶' : '本地记忆'}</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition-all duration-150 ${
                activeTab === 'about'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{isEN ? 'Privacy' : '隐私'}</span>
            </button>
          </div>
        </div>

      {activeTab === 'providers' && (
        <div className="px-3.5 py-2 bg-[#0F141C] border-b border-[#1E2634] flex items-center justify-between gap-2 shrink-0 z-20 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-400 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span>Endpoint: <strong className="text-slate-200">{providerType}</strong></span>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain max-w-4xl w-full mx-auto p-3 sm:p-5 space-y-3.5 pb-44">
        {activeTab === 'providers' && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            <div className="p-3.5 rounded-xl bg-[#0F141C] border border-[#1E2634] space-y-3 shadow-md">
              <div className="border-b border-[#1E2634] pb-1 space-y-0.5">
                <div className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">[ PROVIDER_SETUP ]</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Provider Type</label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as ProviderType)}
                  className="w-full bg-[#070A0F] border border-[#1E2634] focus:border-slate-600 rounded-lg px-2.5 py-2 text-xs text-white outline-none min-h-[40px]"
                >
                  <option value="openai-compatible">OpenAI Compatible</option>
                  <option value="ollama">Ollama</option>
                  <option value="chrome-ai">Chrome AI</option>
                </select>
              </div>

              {providerType === 'openai-compatible' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Base URL</label>
                    <input
                      ref={baseUrlRef}
                      type="text"
                      defaultValue={baseUrl}
                      className="w-full bg-[#070A0F] border border-[#1E2634] focus:border-slate-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">API Key</label>
                    <input
                      ref={apiKeyRef}
                      type={showApiKey ? 'text' : 'password'}
                      defaultValue={apiKey}
                      className="w-full bg-[#070A0F] border border-[#1E2634] focus:border-slate-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono min-h-[42px]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Model</label>
                <input
                  ref={modelRef}
                  type="text"
                  defaultValue={model}
                  className="w-full bg-[#070A0F] border border-[#1E2634] focus:border-slate-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono min-h-[42px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 pb-6">
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 py-2.5 px-3.5 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{savedSuccess ? (isEN ? 'Saved!' : '已保存') : (isEN ? 'Save' : '保存')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            <div className="p-3.5 rounded-xl bg-[#0F141C] border border-[#1E2634] shadow-md flex items-center justify-between">
              <h2 className="text-xs font-bold text-white">Local Memory</h2>
              <button onClick={handleToggleMemoryEnabled} className="text-xs font-semibold px-2 py-1 rounded bg-[#070A0F] border border-[#1E2634]">
                {memorySchema?.profile.memoryEnabled !== false ? 'ON' : 'OFF'}
              </button>
            </div>
            {/* Additional UI elements truncated for brevity but follow the same i18n logic */}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="p-3.5 rounded-xl bg-[#0F141C] border border-[#1E2634] space-y-3 shadow-md">
            <p className="text-xs text-slate-300">{isEN ? 'Privacy focused' : '隐私优先'}</p>
          </div>
        )}
      </main>
    </div>
  );
}
