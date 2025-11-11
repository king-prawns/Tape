import './AudioTracks.css';

import React from 'react';

import AudioTracksIcon from './icons/AudioTracks';
import Menu from './Menu';
import MenuItem from './MenuItem';

type IProps = {
  audioTrack: string;
  audioTracks: Array<string>;
  onAudioTrack: (lang: string) => void;
};
type IState = {
  open: boolean;
};

class AudioTracks extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: false
    };
  }

  private toggleMenu = (): void => {
    this.setState({
      open: !this.state.open
    });
  };

  render(): JSX.Element {
    return (
      <button className="audio-tracks" onClick={this.toggleMenu} title="audio tracks">
        <Menu open={this.state.open}>
          {this.props.audioTracks.map((audioTrack: string, index: number) => (
            <MenuItem
              key={index}
              value={audioTrack}
              current={this.props.audioTrack}
              onMenuItemClick={(): void => this.props.onAudioTrack(audioTrack as string)}
            />
          ))}
        </Menu>
        <AudioTracksIcon />
      </button>
    );
  }
}

export default AudioTracks;
