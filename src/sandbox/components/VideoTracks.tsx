import './VideoTracks.css';

import React from 'react';

import VideoTracksIcon from './icons/VideoTracks';
import Menu from './Menu';
import MenuItem from './MenuItem';

type IProps = {
  videoTrack: number | null;
  videoTracks: Array<number>;
  onVideoTrack: (quality: number | null) => void;
};
type IState = {
  open: boolean;
  auto: boolean;
};

const DEFAULT_VALUE: string = 'auto';

class VideoTracks extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: false,
      auto: true
    };
  }

  private toggleMenu = (): void => {
    this.setState({
      open: !this.state.open
    });
  };

  private onVideoTrackClick = (bandwidth: number | null): void => {
    this.setState({
      auto: !bandwidth
    });
    this.props.onVideoTrack(bandwidth);
  };

  render(): JSX.Element {
    return (
      <button className="video-tracks" onClick={this.toggleMenu} title="video tracks">
        <Menu open={this.state.open}>
          {this.props.videoTracks.map((videoTrack: number, index: number) => (
            <MenuItem
              key={index}
              value={videoTrack}
              current={this.props.videoTrack ?? DEFAULT_VALUE}
              onMenuItemClick={(): void => this.onVideoTrackClick(videoTrack)}
            />
          ))}
          <MenuItem
            value={DEFAULT_VALUE}
            current={this.props.videoTrack ?? DEFAULT_VALUE}
            focus={this.state.auto}
            onMenuItemClick={(): void => this.onVideoTrackClick(null)}
          />
        </Menu>
        <VideoTracksIcon />
      </button>
    );
  }
}

export default VideoTracks;
