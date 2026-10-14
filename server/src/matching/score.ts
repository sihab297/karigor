// out of 100; the exact skill counts the most, then distance (Dhaka traffic), rating and jobs done
export const MATCH_WEIGHTS = { skill: 40, distance: 30, rating: 20, jobs: 10 };

// a new technician counts as having 3 reviews of 4 stars, so they still get a chance
export const STARTING_RATING = 4;
export const STARTING_REVIEWS = 3;

// after this many jobs of the service, more jobs add nothing
export const FULL_JOBS = 20;

export interface Candidate {
  userId: string;
  distanceKm: number;
  skillIds: string[];
  ratingAvg: number;
  ratingCount: number;
  jobsDone: number;
}

export interface Needs {
  skillIds: string[];
  maxKm: number;
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

export function fairRating(ratingAvg: number, ratingCount: number) {
  return (
    (STARTING_RATING * STARTING_REVIEWS + ratingAvg * ratingCount) /
    (STARTING_REVIEWS + ratingCount)
  );
}

// each part is between 0 and 1
export function scoreParts(candidate: Candidate, needs: Needs) {
  const matched = needs.skillIds.filter((id) => candidate.skillIds.includes(id));
  return {
    // no skill from the AI (e.g. the customer changed the service): same for everyone
    skill: needs.skillIds.length > 0 ? matched.length / needs.skillIds.length : 0.5,
    distance: clamp(1 - candidate.distanceKm / needs.maxKm),
    rating: clamp((fairRating(candidate.ratingAvg, candidate.ratingCount) - 1) / 4),
    jobs: clamp(candidate.jobsDone / FULL_JOBS),
  };
}

export function matchScore(candidate: Candidate, needs: Needs) {
  const parts = scoreParts(candidate, needs);
  return (
    MATCH_WEIGHTS.skill * parts.skill +
    MATCH_WEIGHTS.distance * parts.distance +
    MATCH_WEIGHTS.rating * parts.rating +
    MATCH_WEIGHTS.jobs * parts.jobs
  );
}

// ties go to the nearer technician
export function rankCandidates<T extends Candidate>(candidates: T[], needs: Needs, limit = 3): T[] {
  return candidates
    .map((candidate) => ({ candidate, score: matchScore(candidate, needs) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.distanceKm - b.candidate.distanceKm ||
        a.candidate.userId.localeCompare(b.candidate.userId),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
