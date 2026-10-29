const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/";

export function optimizePublicImage(url, width = 800) {
  if (typeof url !== "string" || !url) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com" || !parsed.pathname.includes(CLOUDINARY_UPLOAD_SEGMENT)) {
      return url;
    }

    const safeWidth = Math.min(2000, Math.max(320, Number(width) || 800));
    const transformation = `f_auto,q_auto,w_${safeWidth},c_limit`;
    if (parsed.pathname.includes(`/${transformation}/`)) return url;

    parsed.pathname = parsed.pathname.replace(
      CLOUDINARY_UPLOAD_SEGMENT,
      `${CLOUDINARY_UPLOAD_SEGMENT}${transformation}/`,
    );
    return parsed.toString();
  } catch {
    return url;
  }
}
