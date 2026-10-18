export const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';

export class SerialConnection {
  constructor(api, { data, status, error }) {
    this.api = api; this.onData = data; this.onStatus = status; this.onError = error;
    this.port = null; this.reader = null; this.writer = null; this.readTask = null;
    this.state = 'idle'; this.generation = 0; this.writeTask = Promise.resolve();
  }
  setState(state) { this.state = state; this.onStatus(state); }
  async connect(options) {
    if (this.state !== 'idle') throw new Error('请先断开当前连接。');
    const generation = ++this.generation;
    this.setState('connecting');
    let chosen;
    try {
      // Standard SPP is allowed by Chrome; this filter excludes unrelated BLE.
      chosen = await this.api.requestPort(options.transport === 'bluetooth'
        ? { filters: [{ bluetoothServiceClassId: SPP_UUID }] } : {});
      if (generation !== this.generation) return;
      await chosen.open({ baudRate: options.baudRate, dataBits: options.dataBits,
        stopBits: options.stopBits, parity: options.parity, flowControl: 'none', bufferSize: 8192 });
      if (generation !== this.generation) { await chosen.close(); return; }
      this.port = chosen;
      this.writer = chosen.writable.getWriter();
      this.reader = chosen.readable.getReader();
      this.setState('connected');
      this.readTask = this.readLoop(generation);
    } catch (error) {
      if (chosen?.readable && chosen !== this.port) await chosen.close().catch(() => {});
      if (generation === this.generation) { await this.disconnect(); throw error; }
    }
  }
  async readLoop(generation) {
    try {
      while (this.state === 'connected' && generation === this.generation) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value?.length) this.onData(value);
      }
    } catch (error) {
      if (this.state === 'connected') this.onError(error);
    } finally {
      this.reader?.releaseLock(); this.reader = null;
      // A real unplug/end-of-stream must release the write lock and port too.
      if (this.state === 'connected' && generation === this.generation) {
        this.setState('closing');
        await this.writeTask.catch(() => {});
        this.writer?.releaseLock(); this.writer = null;
        await this.port?.close().catch(() => {}); this.port = null;
        this.setState('idle');
      }
    }
  }
  send(bytes) {
    if (this.state !== 'connected' || !this.writer) return Promise.reject(new Error('请先连接设备。'));
    this.writeTask = this.writeTask.catch(() => {}).then(() => this.writer.write(bytes));
    return this.writeTask;
  }
  async disconnect() {
    ++this.generation;
    const port = this.port;
    if (this.state === 'idle') return;
    this.setState('closing');
    try {
      await this.reader?.cancel().catch(() => {});
      await this.readTask?.catch(() => {});
      await this.writeTask.catch(() => {});
      this.writer?.releaseLock(); this.writer = null;
      if (port) await port.close().catch(() => {});
    } finally { this.port = null; this.reader = null; this.readTask = null; this.setState('idle'); }
  }
}
