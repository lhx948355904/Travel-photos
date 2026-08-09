import { describe, expect, it } from "vitest";
import { resolveInitialPhotoIndex } from "./galleryState";

describe("resolveInitialPhotoIndex", () => {
  const photos = [{ id: 12 }, { id: 18 }, { id: 31 }];

  it("opens the exact cited photo", () => {
    expect(resolveInitialPhotoIndex(photos, 18)).toBe(1);
  });

  it("falls back to the first photo when the cited photo is absent", () => {
    expect(resolveInitialPhotoIndex(photos, 999)).toBe(0);
  });
});
