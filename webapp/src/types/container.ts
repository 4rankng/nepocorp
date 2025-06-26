export interface Container {
  id: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationInfo {
  records_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ContainerApiResponse {
  status: string;
  message: string;
  data: Container[];
  pagination: PaginationInfo;
}