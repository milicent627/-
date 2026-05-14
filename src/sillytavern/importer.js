/**
 * SillyTavern import/export utilities.
 * Vanilla JS port from importer.ts.
 */

function exportAsSillyTavern(lorebooks, presets) {
  const data = [];
  for (const lb of lorebooks) {
    const exportBook = {
      name: lb.name || '',
      description: lb.description || '',
      keys: lb.keys || [],
      entries: (lb.entries || []).map(e => ({
        keys: e.keys || [],
        content: e.content || '',
        order: e.order || 100,
        position: e.position || 'before_char',
        selective: !!e.selective,
        selectiveLogic: e.selectiveLogic || 'and_any',
        secondaryKeys: e.secondaryKeys || [],
        constant: !!e.constant,
        probability: e.probability !== undefined ? e.probability : 100,
        enabled: e.enabled !== false,
      })),
    };
    data.push(exportBook);
  }
  return data;
}

function importFromSillyTavern(rawData) {
  const items = Array.isArray(rawData) ? rawData : (rawData.data || rawData.entries || [rawData]);
  const lorebooks = [];
  const presets = [];

  for (const item of items) {
    if (item.name && (item.entries || item.keys)) {
      lorebooks.push(normalizeLorebook(item));
    }
    if (item.settings && (item.settings.temp_openai !== undefined || item.settings.prompts)) {
      presets.push(normalizePreset(item));
    }
  }

  return { lorebooks, presets };
}

function normalizeLorebook(item) {
  return {
    id: 'lb-' + crypto.randomUUID(),
    name: item.name || '导入的世界书',
    description: item.description || '',
    keys: item.keys || [],
    entries: (item.entries || []).map(e => ({
      id: 'e-' + crypto.randomUUID(),
      keys: e.keys || [],
      content: e.content || '',
      order: e.order || 100,
      position: e.position || 'before_char',
      selective: !!e.selective,
      selectiveLogic: e.selectiveLogic || 'and_any',
      secondaryKeys: e.secondaryKeys || [],
      constant: !!e.constant,
      probability: e.probability !== undefined ? e.probability : 100,
      enabled: e.enabled !== false,
    })),
    recursiveScanning: !!item.recursiveScanning,
    matchWholeWords: !!item.matchWholeWords,
    caseSensitive: !!item.caseSensitive,
    updatedAt: Date.now(),
  };
}

function normalizePreset(item) {
  return {
    id: 'p-' + crypto.randomUUID(),
    name: item.name || '导入的预设',
    description: item.description || '',
    settings: item.settings || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
