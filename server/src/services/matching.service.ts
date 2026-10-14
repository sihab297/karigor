import type { Types } from 'mongoose';
import { rankCandidates, type Candidate } from '../matching/score';
import { ServiceModel } from '../models/service.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import type { UserDocument } from '../models/user.model';
import { AppError, fieldError } from '../utils/app-error';
import { dhakaClock } from '../utils/dhaka-time';
import type { MatchInput } from '../validators/problem.validators';
import { findReport } from './problem.service';

const MAX_KM = 10;
const EMERGENCY_MAX_KM = 5;
const TOP = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD = 30;
// a few minutes of slack for a slow phone or clock
const PAST_SLACK_MS = 5 * 60 * 1000;

interface TechnicianRow {
  userId: Types.ObjectId;
  areaName: string;
  skillIds: string[];
  ratingAvg: number;
  ratingCount: number;
  experienceYears: number;
  jobsDone?: Record<string, number>;
  distanceM: number;
  user: { name: string };
}

interface Match extends Candidate {
  name: string;
  areaName: string;
  experienceYears: number;
}

function checkWhen(when: Date | undefined, now: Date) {
  if (!when) throw fieldError('when', 'Choose a date and time');
  if (when.getTime() < now.getTime() - PAST_SLACK_MS) {
    throw fieldError('when', 'Choose a time from now on');
  }
  if (when.getTime() > now.getTime() + MAX_DAYS_AHEAD * DAY_MS) {
    throw fieldError('when', `Choose a time in the next ${MAX_DAYS_AHEAD} days`);
  }
  return when;
}

export async function findMatches(
  reportId: string,
  customer: UserDocument,
  input: MatchInput,
  now = new Date(),
) {
  const report = await findReport(reportId, customer, { ownerOnly: true });
  const ai = report.ai;
  const suggested = ai?.understood ? ai.serviceId : null;
  const serviceId = report.finalServiceId ?? suggested ?? report.chosenServiceId;
  if (!serviceId) throw new AppError(409, 'CHOOSE_SERVICE', 'Choose the service first.');

  const service = await ServiceModel.findOne({ _id: serviceId, active: true });
  if (!service) {
    throw new AppError(
      409,
      'CHOOSE_SERVICE',
      "We don't offer this service now. Choose another one.",
    );
  }

  // danger now: only people close by who can come straight away,
  // unless the customer chose to book for later
  const emergency = ai?.urgency === 'emergency' && !input.when;
  const when = emergency ? now : checkWhen(input.when, now);
  const maxKm = emergency ? EMERGENCY_MAX_KM : MAX_KM;
  // the AI's skills only fit the AI's own service
  const neededSkills = ai && serviceId === ai.serviceId ? ai.skillIds : [];
  const { day, time } = dhakaClock(when);

  const rows = await TechnicianProfileModel.aggregate<TechnicianRow>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
        distanceField: 'distanceM',
        maxDistance: maxKm * 1000,
        spherical: true,
        query: {
          approvalStatus: 'approved',
          acceptingJobs: true,
          serviceIds: serviceId,
          workingDays: day,
          'workingHours.start': { $lte: time },
          'workingHours.end': { $gt: time },
        },
      },
    },
    // each technician also chooses how far they travel
    { $match: { $expr: { $lte: ['$distanceM', { $multiply: ['$serviceRadiusKm', 1000] }] } } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: { 'user.status': 'active' } },
  ]);

  const candidates: Match[] = rows.map((row) => ({
    userId: row.userId.toString(),
    name: row.user.name,
    areaName: row.areaName,
    distanceKm: row.distanceM / 1000,
    skillIds: row.skillIds,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    jobsDone: row.jobsDone?.[serviceId] ?? 0,
    experienceYears: row.experienceYears,
  }));

  const skillNames = new Map(service.skills.map((skill) => [skill.id, skill.name]));
  const top = rankCandidates(candidates, { skillIds: neededSkills, maxKm }, TOP);

  return {
    serviceId,
    serviceName: service.name,
    emergency,
    when: when.toISOString(),
    searchedKm: maxKm,
    // the score stays hidden; customers see the facts behind it
    matches: top.map((match, index) => ({
      technicianId: match.userId,
      name: match.name,
      areaName: match.areaName,
      distanceKm: Math.round(match.distanceKm * 10) / 10,
      rating: match.ratingCount > 0 ? Math.round(match.ratingAvg * 10) / 10 : null,
      ratingCount: match.ratingCount,
      jobsDone: match.jobsDone,
      experienceYears: match.experienceYears,
      matchedSkills: neededSkills
        .filter((id) => match.skillIds.includes(id))
        .map((id) => ({ id, name: skillNames.get(id) ?? id })),
      bestMatch: index === 0,
    })),
  };
}
