import { mongo, type Types } from 'mongoose';
import { ReviewModel, type ReviewDocument } from '../models/review.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import type { UserDocument } from '../models/user.model';
import { AppError } from '../utils/app-error';
import type { ReviewInput } from '../validators/review.validators';
import { findOwnBooking } from './booking.service';

export function reviewView(review: ReviewDocument) {
  return {
    id: review.id as string,
    rating: review.rating,
    comment: review.comment,
    serviceId: review.serviceId,
    at: review.get('createdAt') as Date,
  };
}

// adds one rating to the average in a single update, so two reviews at once both count
export async function addToTechnicianRating(technicianId: Types.ObjectId, rating: number) {
  await TechnicianProfileModel.updateOne(
    { userId: technicianId },
    [
      {
        $set: {
          ratingAvg: {
            $round: [
              {
                $divide: [
                  { $add: [{ $multiply: ['$ratingAvg', '$ratingCount'] }, rating] },
                  { $add: ['$ratingCount', 1] },
                ],
              },
              2,
            ],
          },
          ratingCount: { $add: ['$ratingCount', 1] },
        },
      },
    ],
    { updatePipeline: true },
  );
}

export async function addReview(bookingId: string, user: UserDocument, input: ReviewInput) {
  const { booking, side } = await findOwnBooking(bookingId, user);
  if (side !== 'customer') {
    throw new AppError(403, 'NOT_ALLOWED', 'Only the customer can review this job.');
  }
  if (booking.status !== 'completed') {
    throw new AppError(409, 'REVIEW_NOT_ALLOWED', 'You can leave a review after the job is done.');
  }

  let review: ReviewDocument;
  try {
    review = await ReviewModel.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      technicianId: booking.technicianId,
      serviceId: booking.serviceId,
      rating: input.rating,
      comment: input.comment,
    });
  } catch (error) {
    // the unique index on bookingId: one review per booking
    if (error instanceof mongo.MongoServerError && error.code === 11000) {
      throw new AppError(409, 'ALREADY_REVIEWED', 'You already reviewed this job.');
    }
    throw error;
  }

  await addToTechnicianRating(booking.technicianId, input.rating);
  return { review: reviewView(review) };
}
