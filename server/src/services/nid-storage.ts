import { cloudinaryClient, uploadPrivateImage } from './cloudinary';

const LINK_MINUTES = 5;

export function uploadNidPhoto(photo: Buffer, userId: string): Promise<string> {
  return uploadPrivateImage(photo, `karigor/nid/${userId}`);
}

export function nidPhotoLink(publicId: string) {
  const cloud = cloudinaryClient();
  const expiresAt = Math.floor(Date.now() / 1000) + LINK_MINUTES * 60;
  const url = cloud.utils.private_download_url(publicId, 'jpg', {
    type: 'authenticated',
    resource_type: 'image',
    expires_at: expiresAt,
  });
  return { url, expiresAt: new Date(expiresAt * 1000).toISOString() };
}
