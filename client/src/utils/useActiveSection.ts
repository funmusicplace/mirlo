import React from "react";

const DEFAULT_DETECTION_ZONE = "-25% 0px -60% 0px";
const PIN_DURATION_MS = 200;

export function useActiveSection(
  sectionIds: string[],
  detectionZone: string = DEFAULT_DETECTION_ZONE
) {
  const [activeId, setActiveId] = React.useState(sectionIds[0]);
  const pinnedUntil = React.useRef(0);
  const idsKey = sectionIds.join(",");
  const sectionIdsRef = React.useRef(sectionIds);
  sectionIdsRef.current = sectionIds;

  React.useEffect(() => {
    const sections = idsKey
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const inZone = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            inZone.add(entry.target);
          } else {
            inZone.delete(entry.target);
          }
        });
        const topmost = sections.find((section) => inZone.has(section));
        if (topmost && Date.now() >= pinnedUntil.current) {
          setActiveId(topmost.id);
        }
      },
      { rootMargin: detectionZone }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [idsKey, detectionZone]);

  const pinSection = React.useCallback((id: string) => {
    if (sectionIdsRef.current.includes(id)) {
      pinnedUntil.current = Date.now() + PIN_DURATION_MS;
      setActiveId(id);
    }
  }, []);

  return {
    activeId: sectionIds.includes(activeId) ? activeId : sectionIds[0],
    pinSection,
  };
}
