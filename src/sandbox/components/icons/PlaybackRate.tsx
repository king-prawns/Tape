import React from 'react';

const PlaybackRate = (): JSX.Element => (
  <svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path
        style={{fill: 'none', stroke: 'var(--color-primary)'}}
        d="M3,16V15a9,9,0,0,1,9-9h0a9,9,0,0,1,9,9v1"
      />
      <circle style={{fill: 'none', stroke: 'var(--color-primary)'}} cx="12" cy="16" r="2" />
      <line
        style={{fill: 'none', stroke: 'var(--color-primary)'}}
        x1="13.41"
        y1="14.59"
        x2="16.5"
        y2="11.5"
      />
    </g>
  </svg>
);

export default PlaybackRate;
