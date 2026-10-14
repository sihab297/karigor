import { describe, expect, it } from 'vitest';
import {
  fairRating,
  matchScore,
  rankCandidates,
  scoreParts,
  STARTING_RATING,
  type Candidate,
} from '../src/matching/score';

const needs = { skillIds: ['tap-repair'], maxKm: 10 };

function tech(userId: string, extra: Partial<Candidate> = {}): Candidate {
  return {
    userId,
    distanceKm: 2,
    skillIds: ['tap-repair'],
    ratingAvg: 4.5,
    ratingCount: 10,
    jobsDone: 10,
    ...extra,
  };
}

describe('fairRating', () => {
  it('starts new technicians at an average rating', () => {
    expect(fairRating(0, 0)).toBe(STARTING_RATING);
  });

  it('lets a few reviews move it only a little', () => {
    expect(fairRating(5, 1)).toBe(4.25);
  });

  it('follows the real rating once there are many reviews', () => {
    expect(fairRating(4.8, 100)).toBeCloseTo(4.78, 2);
  });
});

describe('scoreParts', () => {
  it('gives each part a value between 0 and 1', () => {
    const parts = scoreParts(tech('a', { distanceKm: 2.5, jobsDone: 5 }), needs);

    expect(parts).toEqual({ skill: 1, distance: 0.75, rating: expect.any(Number), jobs: 0.25 });
    expect(parts.rating).toBeGreaterThan(0);
    expect(parts.rating).toBeLessThan(1);
  });

  it('counts how many of the needed skills they have', () => {
    const parts = scoreParts(tech('a', { skillIds: ['pipe-leak'] }), {
      skillIds: ['tap-repair', 'pipe-leak'],
      maxKm: 10,
    });
    expect(parts.skill).toBe(0.5);
  });

  it('treats everyone the same when the AI found no skill', () => {
    expect(scoreParts(tech('a'), { skillIds: [], maxKm: 10 }).skill).toBe(0.5);
    expect(scoreParts(tech('b', { skillIds: [] }), { skillIds: [], maxKm: 10 }).skill).toBe(0.5);
  });

  it('stops counting jobs after 20', () => {
    expect(scoreParts(tech('a', { jobsDone: 200 }), needs).jobs).toBe(1);
  });
});

describe('matchScore', () => {
  it('is between 0 and 100', () => {
    const best = tech('a', { distanceKm: 0, ratingAvg: 5, ratingCount: 1000, jobsDone: 50 });
    const worst = tech('b', {
      distanceKm: 10,
      skillIds: [],
      ratingAvg: 1,
      ratingCount: 1000,
      jobsDone: 0,
    });

    expect(matchScore(best, needs)).toBeCloseTo(100, 0);
    expect(matchScore(worst, needs)).toBeCloseTo(0, 0);
  });
});

describe('rankCandidates', () => {
  it('puts the exact skill first, even a little further away', () => {
    const ranked = rankCandidates(
      [
        tech('no-skill', {
          distanceKm: 1,
          skillIds: ['pipe-leak'],
          ratingAvg: 4.9,
          ratingCount: 30,
        }),
        tech('has-skill', { distanceKm: 4 }),
      ],
      needs,
    );
    expect(ranked.map((t) => t.userId)).toEqual(['has-skill', 'no-skill']);
  });

  it('prefers the nearer one when everything else is the same', () => {
    const ranked = rankCandidates(
      [tech('far', { distanceKm: 8 }), tech('near', { distanceKm: 1 })],
      needs,
    );
    expect(ranked[0]!.userId).toBe('near');
  });

  it('gives a new technician a fair chance against a badly rated one', () => {
    const ranked = rankCandidates(
      [
        tech('badly-rated', { ratingAvg: 2, ratingCount: 10, jobsDone: 0 }),
        tech('new', { ratingAvg: 0, ratingCount: 0, jobsDone: 0 }),
      ],
      needs,
    );
    expect(ranked[0]!.userId).toBe('new');
  });

  it('returns only the top 3', () => {
    const ranked = rankCandidates(
      [1, 2, 3, 4, 5].map((km) => tech(`t${km}`, { distanceKm: km })),
      needs,
    );
    expect(ranked.map((t) => t.userId)).toEqual(['t1', 't2', 't3']);
  });

  it('breaks a full tie by distance', () => {
    const ranked = rankCandidates([tech('b', { distanceKm: 3 }), tech('a', { distanceKm: 3 })], {
      skillIds: ['tap-repair'],
      maxKm: 10,
    });
    expect(ranked.map((t) => t.userId)).toEqual(['a', 'b']);
  });
});
