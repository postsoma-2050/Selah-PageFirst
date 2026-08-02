import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  vite: () => ({
    plugins: [react() as any]
  }),
  manifest: {
    name: 'PageFirst AI Assistant',
    description: 'Page-first AI browser assistant with active context summary, BYOK LLMs, and local memory.',
    version: '1.1.2',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png'
    },
    permissions: [
      'storage',
      'sidePanel',
      'activeTab',
      'scripting',
      'tabs',
      'contextMenus'
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png'
      },
      default_title: 'Open Selah PageFirst'
    },
    side_panel: {
      default_path: 'sidepanel.html'
    },
    commands: {
      _execute_action: {
        description: 'Open PageFirst Assistant',
        suggested_key: {
          default: 'Ctrl+Shift+L'
        }
      },
      execute_side_panel: {
        description: 'Open Side Panel',
        suggested_key: {
          default: 'Ctrl+Shift+Y'
        }
      }
    }
  }
});
