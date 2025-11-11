import './PlaybackRate.css';

import React from 'react';

import PlaybackRateIcon from './icons/PlaybackRate';
import Menu from './Menu';
import MenuItem from './MenuItem';

type IProps = {
  playbackRate: number;
  onPlaybackRate: (rate: number) => void;
};
type IState = {
  open: boolean;
};

class PlaybackRate extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: false
    };
  }

  private onPlaybackRate = (rate: number | string): void => {
    this.props.onPlaybackRate(+rate);
  };

  private toggleMenu = (): void => {
    this.setState({
      open: !this.state.open
    });
  };

  render(): JSX.Element {
    return (
      <button className="playback-rate" onClick={this.toggleMenu} title="playback rate">
        <Menu open={this.state.open}>
          <MenuItem value={0.25} current={this.props.playbackRate} onMenuItemClick={this.onPlaybackRate} />
          <MenuItem value={0.5} current={this.props.playbackRate} onMenuItemClick={this.onPlaybackRate} />
          <MenuItem value={1} current={this.props.playbackRate} onMenuItemClick={this.onPlaybackRate} />
          <MenuItem value={1.5} current={this.props.playbackRate} onMenuItemClick={this.onPlaybackRate} />
          <MenuItem value={2} current={this.props.playbackRate} onMenuItemClick={this.onPlaybackRate} />
        </Menu>
        <PlaybackRateIcon />
      </button>
    );
  }
}

export default PlaybackRate;
