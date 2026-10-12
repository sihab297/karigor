import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

const LINK_MINUTES = 5;

function client() {
  const {
    CLOUDINARY_CLOUD_NAME: cloud_name,
    CLOUDINARY_API_KEY: api_key,
    CLOUDINARY_API_SECRET: api_secret,
  } = env;
  if (!cloud_name || !api_key || !api_secret) {
    throw new AppError(503, 'UPLOADS_NOT_SET_UP', 'Photo upload is not set up yet.');
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return cloudinary;
}

// "authenticated" means there is no public link; it can only be opened with a signed link
export function uploadNidPhoto(photo: Buffer, userId: string): Promise<string> {
  const cloud = client();
  return new Promise((resolve, reject) => {
    cloud.uploader
      .upload_stream(
        {
          public_id: `karigor/nid/${userId}`,
          type: 'authenticated',
          resource_type: 'image',
          format: 'jpg',
          overwrite: true,
          invalidate: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new AppError(502, 'UPLOAD_FAILED', "Couldn't save the photo. Please try again."),
            );
          } else {
            resolve(result.public_id);
          }
        },
      )
      .end(photo);
  });
}

export function nidPhotoLink(publicId: string) {
  const cloud = client();
  const expiresAt = Math.floor(Date.now() / 1000) + LINK_MINUTES * 60;
  const url = cloud.utils.private_download_url(publicId, 'jpg', {
    type: 'authenticated',
    resource_type: 'image',
    expires_at: expiresAt,
  });
  return { url, expiresAt: new Date(expiresAt * 1000).toISOString() };
}
