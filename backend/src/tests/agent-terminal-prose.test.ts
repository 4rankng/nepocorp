import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTerminalProseAnswer } from '../services/agent/orchestrator.js';

const content = 'Doanh thu tháng này là 120.000.000 đồng, chi phí là 90.000.000 đồng và lợi nhuận là 30.000.000 đồng. Chi phí nhiên liệu chiếm tỷ trọng lớn nhất; nên so sánh định mức từng tuyến trước khi điều chỉnh.';
const complete = {
  terminal: { content, finishReason: 'stop' },
  userMessages: ['Phân tích doanh thu và chi phí tháng này'],
  hasSuccessfulDataTool: true,
  hasToolError: false,
};

describe('complete analytical prose avoids a redundant formatting call', () => {
  test('preserves the complete grounded answer and exact numbers', () => {
    assert.deepEqual(selectTerminalProseAnswer(complete), { type: 'text', content });
  });

  test('strips hidden reasoning without changing the answer', () => {
    assert.deepEqual(selectTerminalProseAnswer({ ...complete, terminal: { content: `<think>private reasoning</think>${content}`, finishReason: 'stop' } }), { type: 'text', content });
  });

  for (const request of ['Vẽ biểu đồ doanh thu', 'Cho tôi đồ thị chi phí', 'Lập bảng so sánh theo xe', 'Show a revenue chart', 'Compare with charts', 'Create a graph', 'Show graphs and tables', 'Plot revenue', 'Visualize expenses', 'Show a table', 'Tạo insight_card', 'Hiển thị dashboard']) {
    test(`keeps the structured path for ${request}`, () => {
      assert.equal(selectTerminalProseAnswer({ ...complete, userMessages: [request] }), null);
    });
  }

  test('respects a structured-output request in a follow-up conversation', () => {
    assert.equal(selectTerminalProseAnswer({ ...complete, userMessages: ['Vẽ biểu đồ tháng này', 'Còn tháng trước?'] }), null);
  });

  test('does not treat an exhausted loop or previous conversation as a terminal answer', () => {
    assert.equal(selectTerminalProseAnswer({ ...complete, terminal: undefined }), null);
  });

  for (const finishReason of ['length', 'tool_calls', 'content_filter', null]) {
    test(`keeps finalization for an incomplete or uncertain finish: ${finishReason}`, () => {
      assert.equal(selectTerminalProseAnswer({ ...complete, terminal: { content, finishReason } }), null);
    });
  }

  test('requires a successful data read and no tool error', () => {
    assert.equal(selectTerminalProseAnswer({ ...complete, hasSuccessfulDataTool: false }), null);
    assert.equal(selectTerminalProseAnswer({ ...complete, hasToolError: true }), null);
  });

  for (const invalid of ['', '   ', '{"type":"insight_card","title":"Doanh thu"', '[{"value":120000000}]', '```json\n{"type":"text"}\n```', 'Cần chuyển dữ liệu theo schema JSON và widget nội bộ.']) {
    test(`does not surface raw structured output or internal instructions: ${invalid.slice(0, 28)}`, () => {
      assert.equal(selectTerminalProseAnswer({ ...complete, terminal: { content: invalid, finishReason: 'stop' } }), null);
    });
  }
});
