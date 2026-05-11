import React, { useEffect, useRef, useState } from "react";

const LazyIframe: React.FC<React.IframeHTMLAttributes<HTMLIFrameElement>> = ({
  src,
  ...props
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  // Render iframe without src until visible — no src means no network request
  return <iframe ref={ref} src={shouldLoad ? src : undefined} {...props} />;
};

export default LazyIframe;
