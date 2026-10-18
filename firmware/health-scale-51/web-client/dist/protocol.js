// The page displays values supplied by a device. It never recalibrates them.
const NUM = '-?\\d+(?:\\.\\d+)?';
const EMPTY = '--(?:\\.-)?';
const fields = [
  ['height', new RegExp('(?:身高|距离|\\bH)\\s*[:：]\\s*(' + NUM + '|' + EMPTY + ')\\s*(cm|mm|m)?', 'i')],
  ['weight', new RegExp('(?:体重|重量|\\b[GW])\\s*[:：]\\s*(' + NUM + '|' + EMPTY + ')\\s*(kg|g)?', 'i')],
  ['bmi', new RegExp('\\bBMI\\s*(?:值)?\\s*[:：]\\s*(' + NUM + '|' + EMPTY + ')', 'i')],
];

export function parseLine(line) {
  const result = {};
  for (const [key, pattern] of fields) {
    const match = pattern.exec(line);
    if (match) result[key] = { raw: match[1].startsWith('--') ? null : match[1], unit: match[2]?.toLowerCase() || '' };
  }
  return { values: result, acknowledgement: /Test\s+Ok!/i.test(line) };
}

export class PacketDecoder {
  constructor(encoding = 'gbk', onLine = () => {}, onOverflow = () => {}) {
    this.decoder = new TextDecoder(encoding);
    this.partial = '';
    this.onLine = onLine;
    this.onOverflow = onOverflow;
  }
  push(bytes) {
    const text = this.decoder.decode(bytes, { stream: true });
    this.consume(text);
    return text;
  }
  consume(text) {
    for (const character of text) {
      if (character === '\r' || character === '\n') {
        if (this.partial) { this.onLine(this.partial); this.partial = ''; }
      } else {
        this.partial += character;
        if (this.partial.length > 4096) { this.partial = ''; this.onOverflow(); }
      }
    }
  }
  finish() {
    const tail = this.decoder.decode();
    this.consume(tail);
    if (this.partial) this.onLine(this.partial);
    this.partial = '';
    return tail;
  }
}

export function toHex(bytes) { return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase(); }
export function fromHex(text) {
  const compact = text.replace(/\s+/g, '');
  if (!compact || compact.length % 2 || !/^[\da-f]+$/i.test(compact)) throw new Error('HEX 需要完整的字节，例如 2A 25 23；不能有半个字节或非十六进制字符。');
  return Uint8Array.from(compact.match(/../g), part => parseInt(part, 16));
}
export function encodeCommand(text, mode = 'text', ending = '') {
  if (!text) throw new Error('请先输入要发送的内容。');
  let body;
  if (mode === 'hex') body = fromHex(text);
  else {
    if (/[^\x00-\x7F]/.test(text)) throw new Error('文本发送使用 ASCII。中文或其他编码请在 HEX 模式中输入原始字节。');
    body = new TextEncoder().encode(text);
  }
  const suffix = new TextEncoder().encode(ending);
  if (body.length + suffix.length > 64) throw new Error('这套秤的调试命令每次最多发送 64 字节，请缩短内容。');
  const result = new Uint8Array(body.length + suffix.length);
  result.set(body); result.set(suffix, body.length); return result;
}

// Same byte state machine as src/protocol.c. It does not invent responses to
// commands understood only by an unknown vendor firmware version.
export class FirmwareCommandParser {
  constructor() { this.state = 0; }
  push(bytes) {
    const events = [];
    for (const b of bytes) {
      if (b === 42) { this.state = 1; continue; }
      switch (this.state) {
        case 1:
          if (b === 37) { this.state = 0; events.push('test'); }
          else this.state = b === 66 ? 2 : 0;
          break;
        case 2: this.state = b === 77 ? 3 : 0; break;
        case 3:
          if (b === 35) { this.state = 0; events.push('bmi'); }
          else this.state = b >= 48 && b <= 57 ? 4 : 0;
          break;
        case 4: this.state = 0; if (b === 35) events.push('bmi'); break;
        default: this.state = 0;
      }
    }
    return events;
  }
}
