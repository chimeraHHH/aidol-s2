import test from 'node:test';
import assert from 'node:assert/strict';
import { SerialConnection, SPP_UUID } from '../dist/serial.js';

function fixture() {
  const received = [], writes = [], statuses = [];
  let controller, options, filter, closes = 0;
  const port = {
    readable: new ReadableStream({ start(c) { controller = c; } }),
    writable: new WritableStream({ write(bytes) { writes.push([...bytes]); } }),
    async open(opts) { options = opts; }, async close() { closes++; }
  };
  const api = { async requestPort(filters) { filter = filters; return port; } };
  const connection = new SerialConnection(api, { data: bytes => received.push([...bytes]), status: s => statuses.push(s), error: e => { throw e; } });
  const config = { transport: 'bluetooth', baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' };
  return { connection, port, config, controller: () => controller, received, writes, statuses, stats: () => ({ options, filter, closes }) };
}
test('SPP opens the selected port with 9600 8N1 and does not transmit automatically', async () => {
  const f = fixture(); await f.connection.connect(f.config);
  assert.deepEqual(f.stats().filter, { filters: [{ bluetoothServiceClassId: SPP_UUID }] });
  assert.deepEqual(f.stats().options, { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', bufferSize: 8192 });
  assert.deepEqual(f.writes, []);
  f.controller().enqueue(Uint8Array.of(0, 255)); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.received, [[0, 255]]);
  await f.connection.send(Uint8Array.of(42, 37)); assert.deepEqual(f.writes, [[42, 37]]);
  await f.connection.disconnect(); assert.equal(f.stats().closes, 1); assert.equal(f.connection.state, 'idle');
  assert.equal(f.port.readable.locked, false); assert.equal(f.port.writable.locked, false);
});
test('a device ending the stream releases locks and permits another connection', async () => {
  const f = fixture(); await f.connection.connect(f.config); f.controller().close();
  await f.connection.readTask;
  assert.equal(f.connection.state, 'idle'); assert.equal(f.stats().closes, 1);
  assert.equal(f.port.readable.locked, false); assert.equal(f.port.writable.locked, false);
  await assert.rejects(f.connection.send(Uint8Array.of(42)), /连接/);
});
test('mapped system serial can receive without a Bluetooth service filter or automatic writes', async () => {
  const f = fixture();
  await f.connection.connect({ ...f.config, transport: 'usb' });
  assert.deepEqual(f.stats().filter, {});
  assert.deepEqual(f.writes, []);
  f.controller().enqueue(Uint8Array.of(0xc9, 0xed, 0x0d, 0x0a));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.received, [[0xc9, 0xed, 0x0d, 0x0a]]);
  await f.connection.disconnect();
  assert.equal(f.stats().closes, 1);
  assert.equal(f.port.readable.locked, false);
  assert.equal(f.port.writable.locked, false);
});
test('cancelled browser selection returns to idle with its original error', async () => {
  const error = new DOMException('Cancelled', 'NotFoundError'); const statuses = [];
  const connection = new SerialConnection({ async requestPort() { throw error; } }, { data() {}, status: s => statuses.push(s), error() {} });
  await assert.rejects(connection.connect({ transport: 'bluetooth' }), e => e === error);
  assert.equal(connection.state, 'idle'); assert.equal(statuses.at(-1), 'idle');
});
test('a connection cancelled during device selection cannot become a ghost connection', async () => {
  const f = fixture(); let choose;
  f.connection.api = { requestPort() { return new Promise(resolve => { choose = resolve; }); } };
  const pending = f.connection.connect(f.config);
  await f.connection.disconnect(); choose(f.port); await pending;
  assert.equal(f.connection.state, 'idle'); assert.equal(f.stats().options, undefined); assert.deepEqual(f.writes, []);
});
test('duplicate connects and sends without a connection are rejected', async () => {
  const f = fixture(); await assert.rejects(f.connection.send(Uint8Array.of(42)));
  await f.connection.connect(f.config); await assert.rejects(f.connection.connect(f.config)); await f.connection.disconnect();
});
