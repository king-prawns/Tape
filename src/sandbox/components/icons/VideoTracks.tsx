import React from 'react';

const VideoTracks = (): JSX.Element => (
  <svg
    width="512px"
    height="512px"
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    transform="rotate(90)"
  >
    <path
      style={{fill: 'var(--color-primary)'}}
      d="M96,146.025V16H64V146.025a64.009,64.009,0,0,0,0,123.95V496H96V269.975a64.009,64.009,0,0,0,0-123.95ZM80,240a32,32,0,1,1,32-32A32.036,32.036,0,0,1,80,240Z"
    />
    <path
      style={{fill: 'var(--color-primary)'}}
      d="M272,290.025V16H240V290.025a64.009,64.009,0,0,0,0,123.95V496h32V413.975a64.009,64.009,0,0,0,0-123.95ZM256,384a32,32,0,1,1,32-32A32.036,32.036,0,0,1,256,384Z"
    />
    <path
      style={{fill: 'var(--color-primary)'}}
      d="M448,82.025V16H416V82.025a64.009,64.009,0,0,0,0,123.95V496h32V205.975a64.009,64.009,0,0,0,0-123.95ZM432,176a32,32,0,1,1,32-32A32.036,32.036,0,0,1,432,176Z"
    />
  </svg>
);

export default VideoTracks;
