/**
 * Streaming XML tag parser for AI responses.
 * Vanilla JS port from stream-parser.ts.
 */
const PARTIAL_LIMIT = 64;

class StreamTagParser {
  constructor(tags, opaqueTags) {
    this.state = 'NORMAL'; // NORMAL | BUFFER_TAG | TAGGED | OPAQUE
    this.partial = '';
    this.currentTag = '';
    this.currentBuf = '';
    this.optionBuf = '';
    this.events = [];
    this.tags = tags;
    this.opaqueTags = opaqueTags;
  }

  feed(chunk) {
    this.events = [];
    for (const ch of chunk) this._consume(ch);
    return this.events;
  }

  finish() {
    this.events = [];
    if (this.state === 'BUFFER_TAG' && this.partial) {
      this.events.push({ type: 'raw', chunk: '<' + this.partial });
      this.partial = '';
    }
    if (this.state === 'TAGGED' || this.state === 'OPAQUE') {
      if (this.state === 'TAGGED' && this.currentTag === 'option' && this.optionBuf) {
        this.events.push({ type: 'option-line', line: this.optionBuf });
        this.optionBuf = '';
      }
      this.events.push({ type: 'tag-close', tag: this.currentTag, full: this.currentBuf });
      this.currentBuf = '';
      this.currentTag = '';
    }
    this.state = 'NORMAL';
    return this.events;
  }

  _consume(ch) {
    if (this.state === 'NORMAL') {
      if (ch === '<') {
        this.state = 'BUFFER_TAG';
        this.partial = '';
      } else {
        this.events.push({ type: 'raw', chunk: ch });
      }
      return;
    }
    if (this.state === 'BUFFER_TAG') {
      if (ch === '>') { this._flushTagBuf(); return; }
      if (this.partial.length >= PARTIAL_LIMIT) {
        this.events.push({ type: 'raw', chunk: '<' + this.partial + ch });
        this.partial = '';
        this.state = 'NORMAL';
        return;
      }
      this.partial += ch;
      return;
    }
    if (this.state === 'OPAQUE') {
      this.currentBuf += ch;
      const close = '</' + this.currentTag + '>';
      if (this.currentBuf.endsWith(close)) {
        const inner = this.currentBuf.slice(0, -close.length);
        this.events.push({ type: 'tag-chunk', tag: this.currentTag, chunk: ch });
        this.events.push({ type: 'tag-close', tag: this.currentTag, full: inner });
        this.state = 'NORMAL';
        this.currentBuf = '';
        this.currentTag = '';
      } else {
        this.events.push({ type: 'tag-chunk', tag: this.currentTag, chunk: ch });
      }
      return;
    }
    if (this.state === 'TAGGED') {
      if (ch === '<') {
        this.state = 'BUFFER_TAG';
        this.partial = '';
        return;
      }
      if (this.currentTag === 'option' && ch === '\n') {
        this.events.push({ type: 'option-line', line: this.optionBuf });
        this.optionBuf = '';
      } else if (this.currentTag === 'option') {
        this.optionBuf += ch;
      }
      this.currentBuf += ch;
      this.events.push({ type: 'tag-chunk', tag: this.currentTag, chunk: ch });
    }
  }

  _flushTagBuf() {
    const tagText = this.partial;
    this.partial = '';
    const isClose = tagText.startsWith('/');
    const name = isClose ? tagText.slice(1) : tagText;

    if (isClose) {
      if (this.currentTag && this.currentTag === name) {
        if (this.currentTag === 'option' && this.optionBuf) {
          this.events.push({ type: 'option-line', line: this.optionBuf });
          this.optionBuf = '';
        }
        this.events.push({ type: 'tag-close', tag: this.currentTag, full: this.currentBuf });
        this.currentBuf = '';
        this.currentTag = '';
        this.state = 'NORMAL';
      } else {
        this.events.push({ type: 'raw', chunk: '</' + name + '>' });
        this.state = 'NORMAL';
      }
      return;
    }

    if (!this.tags.includes(name)) {
      this.events.push({ type: 'raw', chunk: '<' + name + '>' });
      this.state = 'NORMAL';
      return;
    }

    this.currentTag = name;
    this.currentBuf = '';
    this.optionBuf = '';
    this.events.push({ type: 'tag-open', tag: name });
    this.state = this.opaqueTags.includes(name) ? 'OPAQUE' : 'TAGGED';
  }
}
