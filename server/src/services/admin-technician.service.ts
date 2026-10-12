import { isValidObjectId, type Types } from 'mongoose';
import { TechnicianProfileModel, type ApprovalStatus } from '../models/technician-profile.model';
import type { UserDocument } from '../models/user.model';
import { AppError } from '../utils/app-error';
import type { ApprovalInput } from '../validators/admin.validators';

const USER_FIELDS = 'name phone email status createdAt';

type ProfileWithUser = InstanceType<typeof TechnicianProfileModel> & { userId: UserDocument };

function withUser(profile: ProfileWithUser) {
  const user = profile.userId;
  return {
    ...(profile.toJSON() as Record<string, unknown>),
    userId: user.id,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      status: user.status,
      joinedAt: user.createdAt,
    },
  };
}

export async function listTechnicians(status: ApprovalStatus) {
  // the waiting list is first come, first served; decisions show the newest first
  const sort: Record<string, 1 | -1> =
    status === 'pending' ? { updatedAt: 1 } : { reviewedAt: -1, updatedAt: -1 };

  const [profiles, totals] = await Promise.all([
    TechnicianProfileModel.find({ approvalStatus: status })
      .sort(sort)
      .populate<{ userId: UserDocument }>('userId', USER_FIELDS),
    TechnicianProfileModel.aggregate<{ _id: ApprovalStatus; count: number }>([
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const { _id, count } of totals) counts[_id] = count;

  return {
    technicians: profiles.filter((p) => p.userId).map((p) => withUser(p as ProfileWithUser)),
    counts,
  };
}

export async function reviewTechnician(
  adminId: Types.ObjectId,
  technicianUserId: string,
  input: ApprovalInput,
) {
  const profile = isValidObjectId(technicianUserId)
    ? await TechnicianProfileModel.findOne({ userId: technicianUserId })
    : null;
  if (!profile) {
    throw new AppError(404, 'TECHNICIAN_NOT_FOUND', 'This technician has not filled in a profile.');
  }

  if (input.status === 'approved') {
    if (!profile.nidPhotoPublicId) {
      throw new AppError(
        409,
        'NID_REQUIRED',
        'You can approve only after the technician uploads their NID photo.',
      );
    }
    profile.approvalStatus = 'approved';
    profile.rejectionReason = undefined;
  } else {
    profile.approvalStatus = 'rejected';
    profile.rejectionReason = input.reason;
  }
  profile.reviewedAt = new Date();
  profile.reviewedBy = adminId;
  await profile.save();

  const saved = await profile.populate<{ userId: UserDocument }>('userId', USER_FIELDS);
  return withUser(saved as ProfileWithUser);
}
