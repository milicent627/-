/**
 * Lorebook keyword matching engine.
 * Vanilla JS port from lorebook-engine.ts.
 */

class LorebookEngine {
  constructor(lorebook) {
    this.lorebook = lorebook;
  }

  scan(text, additionalContext) {
    const normalizedText = this.lorebook.caseSensitive ? text : text.toLowerCase();
    const normalizedContext = additionalContext
      ? (this.lorebook.caseSensitive ? additionalContext : additionalContext.toLowerCase())
      : normalizedText;

    const matched = [];

    for (const entry of this.lorebook.entries) {
      if (entry.constant) {
        matched.push({ entry, score: -9999, matchedKeywords: ['constant'] });
        continue;
      }

      if (Math.random() * 100 >= entry.probability) continue;

      const isMatch = this._checkEntry(entry, normalizedText, normalizedContext);
      if (isMatch) {
        matched.push({
          entry,
          score: entry.order,
          matchedKeywords: entry.keys.filter(k =>
            this._containsKeyword(normalizedText, this._normalize(k))
          ),
        });
      }
    }

    return matched.sort((a, b) => a.score - b.score);
  }

  recursiveScan(initialText, maxDepth, additionalContext) {
    if (!this.lorebook.recursiveScanning || maxDepth <= 0) {
      return this.scan(initialText, additionalContext);
    }
    const maxD = maxDepth || 3;
    const allMatched = new Map();
    let currentText = initialText;
    let depth = 0;

    while (depth < maxD) {
      const newMatches = this.scan(currentText, additionalContext);
      let hasNew = false;

      for (const match of newMatches) {
        if (!allMatched.has(match.entry.id)) {
          allMatched.set(match.entry.id, match);
          currentText += ' ' + match.entry.content;
          hasNew = true;
        }
      }

      if (!hasNew) break;
      depth++;
    }

    return Array.from(allMatched.values()).sort((a, b) => a.score - b.score);
  }

  groupByPosition(matched) {
    const grouped = {
      before_char: [], after_char: [], before_example: [],
      after_example: [], at_depth: [], example_msg_top: [],
      example_msg_bottom: [], outlet: [],
    };
    for (const m of matched) {
      if (grouped[m.entry.position]) {
        grouped[m.entry.position].push(m);
      }
    }
    return grouped;
  }

  formatEntriesContent(entries) {
    if (entries.length === 0) return '';
    return entries.map(e => e.entry.content).join('\n\n');
  }

  _checkEntry(entry, text, context) {
    const keys = entry.keys || [];
    const secondaryKeys = entry.secondaryKeys || [];
    const selective = entry.selective;
    const selectiveLogic = entry.selectiveLogic;

    if (keys.length === 0) return false;

    const primaryMatches = keys.map(k => this._containsKeyword(text, this._normalize(k)));
    const allPrimary = primaryMatches.every(m => m);
    const anyPrimary = primaryMatches.some(m => m);

    let primaryOk = false;
    switch (selectiveLogic) {
      case 'and_all':
      case 'and_any':
        primaryOk = anyPrimary;
        break;
      case 'not_all':
        primaryOk = !allPrimary;
        break;
      case 'not_any':
        primaryOk = !anyPrimary;
        break;
      default:
        primaryOk = anyPrimary;
    }

    if (!primaryOk) return false;
    if (!selective || secondaryKeys.length === 0) return primaryOk;

    const secondaryMatches = secondaryKeys.map(k =>
      this._containsKeyword(context, this._normalize(k))
    );
    const allSecondary = secondaryMatches.every(m => m);
    const anySecondary = secondaryMatches.some(m => m);

    switch (selectiveLogic) {
      case 'and_all': return allSecondary;
      case 'not_all': return allSecondary;
      case 'and_any':
      case 'not_any':
      default:
        return anySecondary;
    }
  }

  _normalize(keyword) {
    return this.lorebook.caseSensitive ? keyword : keyword.toLowerCase();
  }

  _containsKeyword(text, keyword) {
    if (this.lorebook.matchWholeWords) {
      const regex = new RegExp('\\b' + this._escapeRegex(keyword) + '\\b', 'i');
      return regex.test(text);
    }
    return text.includes(keyword);
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

function createLorebookEngine(lorebook) {
  return new LorebookEngine(lorebook);
}
