// Vietnamese labels for the chatbot monitoring dashboard. Split out of
// `chatbot-monitoring-details.tsx` so that module exports only components
// (React Fast Refresh).

export function toolMeaning(name: string): string {
  const meanings: Record<string, string> = {
    'ui.navigate': 'Đưa người dùng tới màn hình cần thao tác.',
    'ui.search_pages': 'Tìm route phù hợp khi người dùng nói bằng ngôn ngữ tự nhiên.',
    'approvals.queue': 'Đọc hàng chờ phê duyệt để trả lời câu hỏi vận hành.',
    'fleet.catalog': 'Đọc danh mục xe, rơ-moóc và tài xế.',
    'customers.list': 'Tra cứu khách hàng, công nợ hoặc hồ sơ liên quan.',
  };
  return meanings[name] ?? 'Công cụ dữ liệu nội bộ được bot gọi trong lượt trả lời.';
}

/** P0b — map a `final_*` fallback-reason bucket to a short Vietnamese label for
 *  the dashboard. Unknown prefixes render verbatim (minus the `final_` stem) so
 *  new buckets the backend emits later stay visible without a frontend change. */
export function fallbackReasonLabel(reason: string): string {
  switch (reason) {
    case 'final_timeout': return 'Hết giờ gọi model';
    case 'final_schema': return 'Sai cấu trúc JSON';
    case 'final_parse': return 'Lỗi parse JSON';
    case 'final_http': return 'Lỗi HTTP model';
    case 'final_no_key': return 'Thiếu API key';
    case 'final_prose_failed': return 'Cả 2 nhánh lỗi';
    default: return reason.replace(/^final_/, '');
  }
}
