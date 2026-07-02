import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../../api/location";
import MosaicBackground from "../../components/MosaicBackground";
import ProfileCard from "../../components/ProfileCard";
import profileMarkdown from "../../content/profile.md?raw";
import type { Location } from "../../types";
import { parseProfileMarkdown } from "../../utils/profileMarkdown";

const profile = parseProfileMarkdown(profileMarkdown);
const fallbackBackgroundImages = ["/landing-archive.png"];

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
  const [backgroundImages, setBackgroundImages] = useState<string[]>(
    fallbackBackgroundImages,
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
        setBackgroundImages(
          uploadedImages.length > 0 ? uploadedImages : fallbackBackgroundImages,
        );
      })
      .catch(() => {
        if (isMounted) setBackgroundImages(fallbackBackgroundImages);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="landing-page">
      <MosaicBackground images={backgroundImages} />

      <main className="landing-scroll-deck">
        <div className="landing-sticky-frame">
          <section className="landing-intro-frame">
            <ProfileCard profile={profile} onEnterMap={enterMap} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;
