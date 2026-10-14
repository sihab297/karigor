import { randomUUID } from 'node:crypto';
import { cloudinaryClient, uploadPrivateImage } from './cloudinary';

// random ids, so nobody can guess another customer's photo
export function uploadProblemPhotos(photos: Buffer[]): Promise<string[]> {
  return Promise.all(
    photos.map((photo) => uploadPrivateImage(photo, `karigor/problems/${randomUUID()}`)),
  );
}

export function problemPhotoUrls(publicIds: string[]): string[] {
  if (publicIds.length === 0) return [];
  const cloud = cloudinaryClient();
  return publicIds.map((id) =>
    cloud.url(id, { type: 'authenticated', sign_url: true, secure: true, format: 'jpg' }),
  );
}
