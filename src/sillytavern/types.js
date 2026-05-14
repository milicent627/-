/**
 * SillyTavern core types (vanilla JS).
 * Mirrors types.ts for use in non-build-step projects.
 */

const DEFAULT_SETTINGS = {
  key: 'settings',
  api: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    secondary: {
      enabled: false,
      baseUrl: '',
      apiKey: '',
      model: '',
    },
  },
  userName: '用户',
  characterName: 'AI',
  activePresetId: null,
  activeLorebookIds: [],
  uiMode: 'game',
  thinkingDisplay: 'fold',
  customTags: ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'],
  formatPromptTemplate: '',
};

function createDefaultPreset() {
  return {
    name: '默认预设',
    description: '基础聊天预设',
    settings: {
      openai_model: 'gpt-3.5-turbo',
      temp_openai: 0.7,
      openai_max_tokens: 2048,
      openai_max_context: 4096,
      top_p_openai: 0.9,
      freq_pen_openai: 0,
      pres_pen_openai: 0,
      stream_openai: true,
      prompt_order: [
        { identifier: 'worldInfoBefore', role: 'system', enabled: true },
        { identifier: 'main', role: 'system', enabled: true },
        { identifier: 'worldInfoAfter', role: 'system', enabled: true },
        { identifier: 'chatHistory', role: 'system', enabled: true },
      ],
      prompts: [],
    },
  };
}
