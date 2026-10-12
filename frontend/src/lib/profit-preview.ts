export interface ProfitPreviewState {
  tripCount?: number;
  distributions?: Array<unknown>;
  entity?: Array<unknown>;
  undistributedProfit?: number;
}

export function getProfitPreviewEmptyMessage(preview: ProfitPreviewState): string | null {
  const hasEntityRows = (preview.entity?.length ?? 0) > 0;
  const hasDistributionRows = (preview.distributions?.length ?? 0) > 0;
  if (hasEntityRows || hasDistributionRows) return null;

  if ((preview.tripCount ?? 0) === 0) {
    return 'Chưa có chuyến hoàn thành hoặc chốt sổ nào trong quý này để phân phối.';
  }

  if ((preview.undistributedProfit ?? 0) > 0) {
    return 'Lợi nhuận quý này chưa gán được cho đối tác sở hữu xe nào nên chưa thể phân phối.';
  }

  return 'Chưa có dữ liệu phân phối cho quý đã chọn.';
}
