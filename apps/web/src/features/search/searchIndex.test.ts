import { describe, expect, it } from 'vitest';
import { normalize, search } from './searchIndex';

describe('search', () => {
  it('ignores Vietnamese accents', () => {
    expect(normalize('Bảo mật & Đánh giá')).toBe('bao mat & danh gia');
    expect(search('vi', 'bao mat').some((r) => r.kind === 'course' && r.url === '/cloud/learn/aws-security')).toBe(true);
  });

  it('finds services, lessons, challenges and glossary terms', () => {
    expect(search('en', 'nat').map((r) => r.kind)).toEqual(expect.arrayContaining(['service', 'lesson', 'challenge', 'term']));
    expect(search('en', 'dynamodb')[0]?.title).toBe('DynamoDB');
  });

  it('returns nothing for an empty query and limits results per kind', () => {
    expect(search('en', '   ')).toEqual([]);
    const byKind = search('en', 'a', 3).reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {});
    expect(Math.max(...Object.values(byKind))).toBeLessThanOrEqual(3);
  });
});
