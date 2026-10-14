import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

export function cloudinaryClient() {
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
export function uploadPrivateImage(photo: Buffer, publicId: string): Promise<string> {
  const cloud = cloudinaryClient();
  return new Promise((resolve, reject) => {
    cloud.uploader
      .upload_stream(
        {
          public_id: publicId,
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
