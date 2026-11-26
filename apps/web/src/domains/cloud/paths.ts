/** URLs of the Cloud domain's own tools (course pages use @/app/paths). */
export const CLOUD = 'cloud';

export const labPath = (query = '') => `/${CLOUD}/lab${query ? `?${query}` : ''}`;
export const challengePath = (exerciseId: string, query = '') => `/${CLOUD}/lab/challenge/${exerciseId}${query ? `?${query}` : ''}`;
export const explorePath = (serviceId?: string) => `/${CLOUD}/explore${serviceId ? `?service=${serviceId}` : ''}`;
