/**
 * Prompt assembler — builds system prompts with lorebooks, variables, macros.
 * Vanilla JS port from prompt-assembler.ts.
 */

function assemblePrompt(options) {
  const { userInput, history, preset, lorebooks, userName, characterName, variables, extraVariables, formatPrompt } = options;

  const allMatched = [];
  const scanText = userInput + ' ' + history.slice(-3).map(m => m.content).join(' ');

  for (const book of lorebooks) {
    const engine = createLorebookEngine(book);
    const matches = engine.recursiveScan(scanText, 3);
    allMatched.push(...matches);
  }

  const uniqueMap = new Map();
  for (const e of allMatched) { uniqueMap.set(e.entry.id, e); }
  const uniqueEntries = Array.from(uniqueMap.values()).sort((a, b) => a.score - b.score);

  const maxContextTokens = (preset.settings.openai_max_context || preset.settings.max_length || 4096);
  let currentTokens = 0;

  const recentHistory = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'system') continue;
    const msgTokens = (msg.content || '').length / 4;
    if (currentTokens + msgTokens > maxContextTokens * 0.8) break;
    recentHistory.unshift({ role: msg.role, content: msg.content });
    currentTokens += msgTokens;
  }

  const promptOrder = (preset.settings.prompt_order || []);
  const prompts = (preset.settings.prompts || []);

  function resolveContent(identifier) {
    if (identifier === 'worldInfoBefore' || identifier === 'worldInfoAfter') {
      const content = uniqueEntries.map(e => e.entry.content).join('\n\n');
      return content || null;
    }
    if (identifier === 'charDescription') return preset.settings.character_description || null;
    if (identifier === 'charPersonality') return preset.settings.character_personality || null;
    if (identifier === 'scenario') return preset.settings.scenario || null;
    if (identifier === 'personaDescription') return preset.settings.persona_description || null;
    if (identifier === 'dialogueExamples') return preset.settings.dialogue_examples || null;
    if (identifier === 'groupNudge') return preset.settings.group_nudge_prompt || null;
    if (identifier === 'impersonate') return preset.settings.impersonation_prompt || null;
    if (identifier === 'quietPrompt') return preset.settings.quiet_prompt || null;
    if (identifier === 'bias') return null;
    const custom = prompts.find(p => p.identifier === identifier);
    if (custom && custom.content) return custom.content;
    const direct = preset.settings[identifier];
    if (typeof direct === 'string' && direct.trim()) return direct;
    return null;
  }

  const assembledMessages = [];
  let systemAcc = '';
  let hasChatHistory = false;

  for (const item of promptOrder) {
    if (item.enabled === false) continue;

    if (item.identifier === 'chatHistory') {
      hasChatHistory = true;
      if (systemAcc) {
        assembledMessages.push({ role: 'system', content: systemAcc });
        systemAcc = '';
      }
      assembledMessages.push(...recentHistory);
      continue;
    }

    const rawContent = resolveContent(item.identifier);
    if (!rawContent) continue;

    let content = replaceMacros(rawContent, { userName, characterName, userInput, variables });
    if (!content.trim()) continue;

    const role = item.role || 'system';
    if (role === 'system') {
      systemAcc += (systemAcc ? '\n\n' : '') + content;
    } else {
      if (systemAcc) {
        assembledMessages.push({ role: 'system', content: systemAcc });
        systemAcc = '';
      }
      assembledMessages.push({ role, content });
    }
  }

  const varsBlock = formatVariablesForPrompt(variables || {});
  if (varsBlock) {
    systemAcc += (systemAcc ? '\n\n' : '') + varsBlock;
  }

  if (extraVariables && Object.keys(extraVariables).length > 0) {
    const extraBlock = formatVariablesForPrompt(extraVariables);
    if (extraBlock) {
      systemAcc += (systemAcc ? '\n\n' : '') + extraBlock;
    }
  }

  if (formatPrompt) {
    systemAcc += (systemAcc ? '\n\n' : '') + formatPrompt;
  }

  if (systemAcc) {
    assembledMessages.unshift({ role: 'system', content: systemAcc });
  }

  if (!hasChatHistory) {
    assembledMessages.push(...recentHistory);
  }

  assembledMessages.push({ role: 'user', content: userInput });

  const systemPrompt = assembledMessages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .join('\n\n');

  return {
    messages: assembledMessages,
    matchedEntries: uniqueEntries,
    systemPrompt,
  };
}

function replaceMacros(template, context) {
  let result = template
    .replace(/\{\{user\}\}/g, context.userName)
    .replace(/\{\{char\}\}/g, context.characterName)
    .replace(/\{\{original\}\}/g, context.userInput);

  if (context.variables) {
    result = result.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const value = context.variables[key.trim()];
      return value !== undefined ? String(value) : match;
    });
  }

  return result;
}
