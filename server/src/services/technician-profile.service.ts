import { isValidObjectId, type HydratedDocument, type Types } from 'mongoose';
import { ServiceModel } from '../models/service.model';
import { TechnicianProfileModel, type TechnicianProfile } from '../models/technician-profile.model';
import { AppError, fieldError } from '../utils/app-error';
import { roundCoordinate } from '../utils/geo';
import { nidPhotoLink, uploadNidPhoto } from './nid-storage';
import type { ProfileInput } from '../validators/technician.validators';

type TechnicianProfileDocument = HydratedDocument<TechnicianProfile>;

// the admin can change the catalog, so check against the database, not the seed files
async function checkServicesAndSkills(serviceIds: string[], skillIds: string[]) {
  const uniqueServiceIds = [...new Set(serviceIds)];
  const services = await ServiceModel.find({ _id: { $in: uniqueServiceIds }, active: true });

  const missing = uniqueServiceIds.filter((id) => !services.some((s) => s._id === id));
  if (missing.length > 0) {
    throw fieldError('serviceIds', `We don't offer this service: ${missing.join(', ')}`);
  }

  const allowed = new Map<string, string>();
  for (const service of services) {
    for (const skill of service.skills) allowed.set(skill.id, service._id);
  }

  const unknown = skillIds.filter((id) => !allowed.has(id));
  if (unknown.length > 0) {
    throw fieldError(
      'skillIds',
      `These skills don't belong to the services you chose: ${unknown.join(', ')}`,
    );
  }

  const withoutSkills = services.filter((s) => !skillIds.some((id) => allowed.get(id) === s._id));
  if (withoutSkills.length > 0) {
    throw fieldError(
      'skillIds',
      `Choose at least one skill for ${withoutSkills.map((s) => s.name).join(', ')}`,
    );
  }

  return { serviceIds: uniqueServiceIds, skillIds: [...new Set(skillIds)] };
}

export function getMyProfile(userId: Types.ObjectId) {
  return TechnicianProfileModel.findOne({ userId });
}

export async function saveMyProfile(userId: Types.ObjectId, input: ProfileInput) {
  const { serviceIds, skillIds } = await checkServicesAndSkills(input.serviceIds, input.skillIds);

  const details = {
    serviceIds,
    skillIds,
    areaName: input.areaName,
    location: {
      type: 'Point' as const,
      coordinates: [roundCoordinate(input.location.lng), roundCoordinate(input.location.lat)],
    },
    serviceRadiusKm: input.serviceRadiusKm,
    workingDays: [...input.workingDays].sort(),
    workingHours: input.workingHours,
    experienceYears: input.experienceYears,
  };

  const existing = await TechnicianProfileModel.findOne({ userId });
  if (!existing) {
    return TechnicianProfileModel.create({ userId, ...details });
  }

  existing.set(details);
  backInQueueIfRejected(existing);
  return existing.save();
}

// a rejected technician who fixes their profile or photo goes back in the queue
function backInQueueIfRejected(profile: TechnicianProfileDocument) {
  if (profile.approvalStatus === 'rejected') {
    profile.approvalStatus = 'pending';
    profile.rejectionReason = undefined;
  }
}

async function findProfileOrFail(userId: Types.ObjectId) {
  const profile = await TechnicianProfileModel.findOne({ userId });
  if (!profile) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', 'Fill in your profile first.');
  }
  return profile;
}

export async function setAvailability(userId: Types.ObjectId, acceptingJobs: boolean) {
  const profile = await findProfileOrFail(userId);
  profile.acceptingJobs = acceptingJobs;
  return profile.save();
}

export async function saveNidPhoto(userId: Types.ObjectId, photo: Buffer) {
  const profile = await findProfileOrFail(userId);
  profile.nidPhotoPublicId = await uploadNidPhoto(photo, userId.toString());
  backInQueueIfRejected(profile);
  return profile.save();
}

export async function getNidPhotoLink(technicianUserId: string) {
  const profile = isValidObjectId(technicianUserId)
    ? await TechnicianProfileModel.findOne({ userId: technicianUserId })
    : null;
  if (!profile?.nidPhotoPublicId) {
    throw new AppError(404, 'NID_NOT_FOUND', "This technician hasn't uploaded an NID photo yet.");
  }
  return nidPhotoLink(profile.nidPhotoPublicId);
}
