/**
 * Variable extraction and formatting utilities.
 * Vanilla JS port from variables.ts.
 */

function formatVariablesForPrompt(variables) {
  if (!variables || Object.keys(variables).length === 0) return '';
  const lines = ['[游戏变量]'];
  for (const [key, value] of Object.entries(variables)) {
    lines.push(key + ': ' + value);
  }
  return lines.join('\n');
}

function extractVariablesFromXml(text) {
  const vars = {};
  const varRegex = /<var\s+name="([^"]+)"\s+value="([^"]*)"\s*\/?>/gi;
  let match;
  while ((match = varRegex.exec(text)) !== null) {
    const name = match[1];
    let value = match[2];
    if (!isNaN(Number(value)) && value.trim() !== '') {
      value = Number(value);
    }
    vars[name] = value;
  }
  return vars;
}

function mergeVariables(base, updates) {
  const merged = Object.assign({}, base);
  for (const [key, value] of Object.entries(updates)) {
    merged[key] = value;
  }
  return merged;
}
