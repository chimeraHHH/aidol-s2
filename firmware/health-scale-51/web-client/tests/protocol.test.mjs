import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PacketDecoder, parseLine, fromHex, toHex, encodeCommand, FirmwareCommandParser } from '../dist/protocol.js';
const fixtures = JSON.parse(readFileSync(new URL('../dist/fixtures.json', import.meta.url)));

test('every possible GBK split preserves Chinese and a 3.2 kg reading', () => {
  const bytes = fromHex(fixtures[0].waiting);
  for (let split = 0; split <= bytes.length; split++) {
    const lines = []; const decoder = new PacketDecoder('gbk', line => lines.push(line));
    const text = decoder.push(bytes.slice(0, split)) + decoder.push(bytes.slice(split)) + decoder.finish();
    assert.equal(text, '身高:1.70m 体重:3.2Kg \r\nBMI值:--.-\r\n\r\n');
    assert.equal(lines.length, 2); assert.equal(parseLine(lines[0]).values.weight.raw, '3.2');
    assert.equal(parseLine(lines[1]).values.bmi.raw, null);
  }
});
test('single-byte chunks and mixed line endings retain all complete lines', () => {
  const lines = []; const decoder = new PacketDecoder('utf-8', line => lines.push(line));
  for (const b of new TextEncoder().encode('距离：0.06m\r\n重量：0.0kg\nBMI:-188369400000.0')) decoder.push(Uint8Array.of(b));
  assert.equal(lines.length, 2); decoder.finish(); assert.equal(lines.length, 3);
  assert.equal(parseLine(lines[0]).values.height.raw, '0.06');
  assert.equal(parseLine(lines[1]).values.weight.raw, '0.0');
  assert.equal(parseLine(lines[2]).values.bmi.raw, '-188369400000.0');
});
test('legacy fields, units, placeholders and test replies', () => {
  assert.deepEqual(parseLine('H:0.06m G:963.9Kg').values, { height: { raw: '0.06', unit: 'm' }, weight: { raw: '963.9', unit: 'kg' } });
  assert.equal(parseLine('W:3200g').values.weight.unit, 'g');
  assert.equal(parseLine('BMI值:24.4').values.bmi.raw, '24.4');
  assert.equal(parseLine('BMI值:--.-').values.bmi.raw, null);
  assert.equal(parseLine('Test Ok!').acknowledgement, true);
  assert.deepEqual(parseLine('<img src=x onerror=alert(1)>').values, {});
});
test('long unbroken input cannot grow the line buffer without bound', () => {
  let overflow = 0; const lines = [];
  const decoder = new PacketDecoder('utf-8', line => lines.push(line), () => overflow++);
  decoder.push(new TextEncoder().encode('x'.repeat(4097) + 'W:0.1kg\n'));
  assert.equal(overflow, 1); assert.equal(parseLine(lines[0]).values.weight.raw, '0.1');
});
test('HEX preserves zero and high bytes; malformed commands are rejected', () => {
  assert.equal(toHex(fromHex('00 2a 25 FF')), '00 2A 25 FF');
  assert.deepEqual(encodeCommand('*%#'), Uint8Array.of(42, 37, 35));
  assert.deepEqual(encodeCommand('2a25', 'hex', '\r\n'), Uint8Array.of(42, 37, 13, 10));
  for (const bad of ['', '2A2', 'zz', '2G', '0x2A']) assert.throws(() => fromHex(bad));
  assert.throws(() => encodeCommand('中文'));
  assert.throws(() => encodeCommand('a'.repeat(65)));
  assert.throws(() => encodeCommand('a'.repeat(64), 'text', '\r\n'));
});
test('simulation command responses match the existing repaired firmware framing', () => {
  const parser = new FirmwareCommandParser();
  assert.deepEqual(parser.push(encodeCommand('*%#')), ['test']);
  assert.deepEqual(parser.push(encodeCommand('*BMI#')), []);
  assert.deepEqual(parser.push(encodeCommand('*B')), []);
  assert.deepEqual(parser.push(encodeCommand('M0#')), ['bmi']);
  assert.deepEqual(parser.push(encodeCommand('*BM#*%')), ['bmi', 'test']);
  assert.deepEqual(parser.push(encodeCommand('*bad*BM9#')), ['bmi']);
});
