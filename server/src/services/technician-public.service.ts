import { isValidObjectId } from 'mongoose';
import { ReviewModel } from '../models/review.model';
import { ServiceModel } from '../models/service.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import { UserModel, type UserDocument } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { shortName } from '../utils/names';

const NOT_FOUND = "We couldn't find this karigor.";
const REVIEWS_SHOWN = 20;

// customers only see approved technicians who are not blocked; the admin sees everyone
async function findVisibleTechnician(id: string, viewer: UserDocument) {
  const [user, profile] = isValidObjectId(id)
    ? await Promise.all([
        UserModel.findOne({ _id: id, role: 'technician' }, 'name status createdAt'),
        TechnicianProfileModel.findOne({ userId: id }),
      ])
    : [null, null];
  const visible =
    user &&
    profile &&
    (viewer.role === 'admin' ||
      (profile.approvalStatus === 'approved' && user.status === 'active'));
  if (!visible) throw new AppError(404, 'TECHNICIAN_NOT_FOUND', NOT_FOUND);
  return { user, profile };
}

// what a customer may see before booking: no phone, no exact location, no NID
export async function getPublicProfile(id: string, viewer: UserDocument) {
  const { user, profile } = await findVisibleTechnician(id, viewer);
  const services = await ServiceModel.find({ _id: { $in: profile.serviceIds } });
  const jobsDone = Object.fromEntries(profile.jobsDone ?? new Map<string, number>());

  return {
    technician: {
      id: user.id as string,
      name: user.name,
      areaName: profile.areaName,
      experienceYears: profile.experienceYears,
      rating: profile.ratingCount > 0 ? Math.round(profile.ratingAvg * 10) / 10 : null,
      ratingCount: profile.ratingCount,
      jobsDone: Object.values(jobsDone).reduce((sum, n) => sum + n, 0),
      services: profile.serviceIds.map((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        return {
          id: serviceId,
          name: service?.name ?? serviceId,
          jobsDone: jobsDone[serviceId] ?? 0,
          // only the skills this technician has
          skills: (service?.skills ?? [])
            .filter((skill) => profile.skillIds.includes(skill.id))
            .map((skill) => ({ id: skill.id, name: skill.name })),
        };
      }),
      workingDays: profile.workingDays,
      workingHours: profile.workingHours,
      acceptingJobs: profile.acceptingJobs,
      memberSince: user.get('createdAt') as Date,
    },
  };
}

export async function getPublicReviews(id: string, viewer: UserDocument) {
  const { user } = await findVisibleTechnician(id, viewer);
  const reviews = await ReviewModel.find({ technicianId: user._id })
    .sort({ createdAt: -1 })
    .limit(REVIEWS_SHOWN);
  const [customers, services, total] = await Promise.all([
    UserModel.find({ _id: { $in: reviews.map((r) => r.customerId) } }, 'name'),
    ServiceModel.find({ _id: { $in: [...new Set(reviews.map((r) => r.serviceId))] } }, 'name'),
    ReviewModel.countDocuments({ technicianId: user._id }),
  ]);
  const customerName = new Map(customers.map((c) => [c.id as string, c.name]));
  const serviceName = new Map(services.map((s) => [s.id as string, s.name]));

  return {
    total,
    reviews: reviews.map((review) => ({
      id: review.id as string,
      rating: review.rating,
      comment: review.comment,
      serviceName: serviceName.get(review.serviceId) ?? review.serviceId,
      at: review.get('createdAt') as Date,
      customerName: shortName(customerName.get(review.customerId.toString()) ?? 'Customer'),
    })),
  };
}
