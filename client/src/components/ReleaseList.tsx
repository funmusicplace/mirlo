import React from 'react';
import { css } from '@emotion/css';
import AlbumCover from './AlbumCover';

interface Release {
  id: string;
  title: string;
  coverUrl: string;
  releaseDate: string;
  subscribeUrl: string;
}

interface ReleaseListProps {
  releases: Release[];
}

const ReleaseList: React.FC<ReleaseListProps> = ({ releases }) => {
  return (
    <ul className="release-list">
      {releases.map((release) => (
        <li key={release.id} className="release-item">
          <AlbumCover 
            src={release.coverUrl} 
            alt={`Cover for ${release.title}`} 
            title={release.title}
          />
          <div className="release-details">
            <h3>{release.title}</h3>
            <p>Released: {release.releaseDate}</p>
            <a href={release.subscribeUrl} className={css`
              color: #1a0dab;
              text-decoration: none;
              &:hover,
              &:focus {
                text-decoration: underline;
                color: #d22780;
              }
            `}>
              Subscribe
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ReleaseList;