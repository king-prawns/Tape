import './TextTracks.css';

import React from 'react';

import TextTracksIcon from './icons/TextTracks';
import Menu from './Menu';
import MenuItem from './MenuItem';

type IProps = {
  textTrack: string | null;
  textTracks: Array<string>;
  onTextTrack: (lang: string | null) => void;
};
type IState = {
  open: boolean;
};

const DEFAULT_VALUE: string = 'off';

class TextTracks extends React.Component<IProps, IState> {
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
      <button className="text-tracks" onClick={this.toggleMenu} title="text tracks">
        <Menu open={this.state.open}>
          {this.props.textTracks.map((textTrack: string, index: number) => (
            <MenuItem
              key={index}
              value={textTrack}
              current={this.props.textTrack ?? DEFAULT_VALUE}
              onMenuItemClick={(): void => this.props.onTextTrack(textTrack as string)}
            />
          ))}
          <MenuItem
            value={DEFAULT_VALUE}
            current={this.props.textTrack ?? DEFAULT_VALUE}
            onMenuItemClick={(): void => this.props.onTextTrack(null)}
          />
        </Menu>
        <TextTracksIcon />
      </button>
    );
  }
}

export default TextTracks;
