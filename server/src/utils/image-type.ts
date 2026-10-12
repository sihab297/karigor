// check the first bytes of the file, because the file name and type can be faked
export function detectImageType(file: Buffer): 'jpg' | 'png' | null {
  if (file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) return 'jpg';
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (file.length >= 8 && pngSignature.every((byte, i) => file[i] === byte)) return 'png';
  return null;
}
