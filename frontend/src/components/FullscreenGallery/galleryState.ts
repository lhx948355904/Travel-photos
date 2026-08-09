export const resolveInitialPhotoIndex = (
  photos: Array<{ id: number }>,
  initialPhotoId?: number | null,
): number => {
  if (initialPhotoId == null) return 0;
  return Math.max(
    0,
    photos.findIndex((photo) => photo.id === initialPhotoId),
  );
};
