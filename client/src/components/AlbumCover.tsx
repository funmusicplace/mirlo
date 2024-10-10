import React from 'react';

interface AlbumCoverProps {
  src: string;
  alt: string;
  title: string;
}

const AlbumCover: React.FC<AlbumCoverProps> = ({ src, alt, title }) => {
  return (
    <div 
      tabIndex={0} 
      role="img" 
      aria-label={`Album cover for ${title}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        width: '200px',
        height: '200px',
      }}
    >
      <span className="visually-hidden">{alt}</span>
    </div>
  );
};

export default AlbumCover;