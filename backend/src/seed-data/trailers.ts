import { TrailerType, TrailerStatus } from '@nepocorp/shared';

export const trailers = [
  { licensePlate: '30R-0001', type: TrailerType.FT40, status: TrailerStatus.ACTIVE },
  { licensePlate: '30R-0002', type: TrailerType.FT20, status: TrailerStatus.ACTIVE },
  { licensePlate: '30R-0003', type: TrailerType.FT40, status: TrailerStatus.ACTIVE },
  { licensePlate: '30R-0004', type: TrailerType.FT20, status: TrailerStatus.ACTIVE },
  { licensePlate: '30R-0005', type: TrailerType.FT40, status: TrailerStatus.MAINTENANCE },
  { licensePlate: '30R-0006', type: TrailerType.FT20, status: TrailerStatus.ACTIVE },
  { licensePlate: '30R-0007', type: TrailerType.FT40, status: TrailerStatus.ACTIVE },
];
