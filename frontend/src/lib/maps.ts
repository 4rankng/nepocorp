// MOCK implementation of Google Maps APIs for demo purposes

export interface PlaceSuggestion {
  placeId: string;
  description: string;
}

const MOCK_PLACES: PlaceSuggestion[] = [
  { placeId: '1', description: 'Cảng Hải Phòng' },
  { placeId: '2', description: 'Cảng Cát Lái, TP HCM' },
  { placeId: '3', description: 'Nhà máy Samsung Thái Nguyên' },
  { placeId: '4', description: 'KCN VSIP Bắc Ninh' },
  { placeId: '5', description: 'KCN Nội Bài, Hà Nội' },
  { placeId: '6', description: 'Nhà máy Honda Vĩnh Phúc' },
  { placeId: '7', description: 'KCN Phố Nối A, Hưng Yên' },
  { placeId: '8', description: 'Cảng Hải An, Hải Phòng' },
  { placeId: '9', description: 'Cảng Đình Vũ, Hải Phòng' },
  { placeId: '10', description: 'Cảng Lạch Huyện, Hải Phòng' },
  { placeId: '11', description: 'Cảng Nam Hải Đình Vũ' },
  { placeId: '12', description: 'KCN Thăng Long, Hà Nội' },
  { placeId: '13', description: 'Kho Mỹ Đình, Hà Nội' },
];

function removeDiacritics(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (!input.trim()) return [];
  
  const lowerInput = removeDiacritics(input.toLowerCase());
  return MOCK_PLACES.filter(p => removeDiacritics(p.description.toLowerCase()).includes(lowerInput));
}

// Map of placeId to placeId and their distance in Km
const MOCK_DISTANCES: Record<string, Record<string, number>> = {
  '1': { '3': 180, '4': 120, '5': 150, '6': 170, '7': 80 },
  '3': { '1': 180, '4': 60, '5': 45, '6': 55, '7': 110 },
  '4': { '1': 120, '3': 60, '5': 35, '6': 75, '7': 40 },
  '5': { '1': 150, '3': 45, '4': 35, '6': 25, '7': 65 },
  '6': { '1': 170, '3': 55, '4': 75, '5': 25, '7': 90 },
  '7': { '1': 80, '3': 110, '4': 40, '5': 65, '6': 90 },
};

export async function calculateDistanceKm(originDesc: string, destDesc: string): Promise<number | null> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

  const origin = MOCK_PLACES.find(p => p.description === originDesc);
  const dest = MOCK_PLACES.find(p => p.description === destDesc);

  if (origin && dest) {
    if (origin.placeId === dest.placeId) return 0;
    
    // Check matrix
    const dist = MOCK_DISTANCES[origin.placeId]?.[dest.placeId] || MOCK_DISTANCES[dest.placeId]?.[origin.placeId];
    if (dist) return dist;
  }

  // Fallback to a random plausible distance if we don't have a strict match but there is input
  if (originDesc && destDesc && originDesc !== destDesc) {
    // Generate deterministic pseudo-random distance based on string length to look realistic
    const hash = originDesc.length * destDesc.length * 5;
    return (hash % 150) + 10; 
  }

  return null;
}
