import React from "react";

const InstanceLogoImage: React.FC<{
  logo: Pick<InstanceLogo, "url"> & Partial<InstanceLogo>;
  tint?: boolean;
  className?: string;
  onError?: () => void;
}> = ({ logo, tint, className, onError }) => {
  const filterId = `instance-logo-tint${React.useId().replace(/:/g, "")}`;

  return (
    <>
      {tint && (
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feFlood style={{ floodColor: "var(--mi-button-color)" }} />
            <feComposite in2="SourceAlpha" operator="in" />
          </filter>
        </svg>
      )}
      <img
        src={logo.url}
        alt=""
        width={logo.width}
        height={logo.height}
        className={`object-contain object-left ${className ?? ""}`}
        style={tint ? { filter: `url("#${filterId}")` } : undefined}
        onError={onError}
      />
    </>
  );
};

export default InstanceLogoImage;
