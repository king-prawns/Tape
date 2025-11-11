import './Volume.css';

import React from 'react';

import Muted from './icons/Muted';
import Unmuted from './icons/Unmuted';

type IProps = {
  volume: number;
  muted: boolean;
  onMute: () => void;
  onUnmute: () => void;
  onVolume: (volume: number) => void;
};
type IState = Record<string, never>;

class Volume extends React.Component<IProps, IState> {
  private _ref: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

  private onMuteUnmuted = (): void => {
    if (this.props.muted) {
      this.props.onUnmute();
    } else {
      this.props.onMute();
    }
  };

  private onClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    const x: number = event.nativeEvent.offsetX;
    const barWidth: number | undefined = this._ref.current?.clientWidth;
    let time: number = 0;
    if (barWidth) {
      time = Math.round((x / barWidth) * 100) / 100;
    }

    this.props.onVolume(time);
  };

  private secondsToPixel = (volume: number): number => {
    const barWidth: number | undefined = this._ref.current?.clientWidth;
    if (barWidth) {
      return barWidth * volume;
    }

    return 0;
  };

  render(): JSX.Element {
    return (
      <div className="volume">
        <button onClick={this.onMuteUnmuted} title="mute/umute">
          {this.props.muted ? <Muted /> : <Unmuted />}
        </button>
        <div className="bar" ref={this._ref} onClick={this.onClick}>
          <div
            className="level"
            style={{
              width: this.secondsToPixel(this.props.volume)
            }}
          ></div>
        </div>
      </div>
    );
  }
}

export default Volume;
