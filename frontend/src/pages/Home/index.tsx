import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../../api/location";
import MosaicBackground from "../../components/MosaicBackground";
import ProfileCard from "../../components/ProfileCard";
import profileMarkdown from "../../content/profile.md?raw";
import type { Location } from "../../types";
import { parseProfileMarkdown } from "../../utils/profileMarkdown";

const profile = parseProfileMarkdown(profileMarkdown);
const fallbackGalleryImages = ["/landing-archive.png"];

const collectBackgroundImages = (locations: Location[]) => {
  const imageUrls = locations.flatMap((location) => [
    location.coverThumbUrl,
    ...(location.photos || []).map((photo) => photo.thumbUrl || photo.url),
  ]);

  return Array.from(
    new Set(imageUrls.filter((url): url is string => Boolean(url))),
  ).slice(0, 18);
};

const Home = () => {
  const navigate = useNavigate();
  const [galleryImages, setGalleryImages] = useState<string[]>(
    fallbackGalleryImages,
  );

  const enterMap = useCallback(() => {
    navigate("/map");
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    getLocations()
      .then((locations) => {
        if (!isMounted) return;

        const uploadedImages = collectBackgroundImages(locations);
        setGalleryImages(
          uploadedImages.length > 0 ? uploadedImages : fallbackGalleryImages,
        );
      })
      .catch(() => {
        if (isMounted) setGalleryImages(fallbackGalleryImages);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="landing-page">
      <MosaicBackground images={galleryImages} />
      <ProfileCard
        profile={profile}
        onEnterMap={enterMap}
      />
    </main>
  );
};

export default Home;
