import './Stats.css';

import React from 'react';

import {EManifestType, EPlayerState, ISeekableRange} from '../..';

type IProps = {
  manifestType: EManifestType;
  playerState: EPlayerState;
  currentTime: number;
  seekableRange: ISeekableRange;
  volume: number;
  muted: boolean;
  audioBitrate: number;
  textBitrate: number;
  videoBitrate: number;
  estimatedBandwidth: number;
  audioBuffer: Array<Array<number>>;
  videoBuffer: Array<Array<number>>;
  memoryHeap: number;
  error: {code: string; message: string} | null;
};
type IState = {
  playerStates: Array<EPlayerState>;
  vst: number;
};

class Stats extends React.Component<IProps, IState> {
  private _timer: number = 0;
  constructor(props: IProps) {
    super(props);
    this.state = {
      playerStates: [],
      vst: 0
    };
  }

  componentDidUpdate(prevProps: IProps): void {
    if (this.props.playerState !== prevProps.playerState) {
      if (this.props.playerState === EPlayerState.LOADING) {
        this.setState({
          playerStates: [this.props.playerState]
        });
      } else {
        this.setState({
          playerStates: [...this.state.playerStates, this.props.playerState]
        });
      }

      if (this.state.vst === 0) {
        this.calculateVst(this.props.playerState);
      }

      if (this.props.playerState === EPlayerState.STOPPED) {
        this.setState({
          vst: 0
        });
      }
    }
  }

  private getBufferInfo(buffer: Array<Array<number>>, currentTime: number): string {
    let behind: number = Infinity;
    let ahead: number = 0;
    for (let i: number = 0; i < buffer.length; i++) {
      const range: Array<number> = buffer[i];
      if (range[0] < behind) {
        behind = range[0];
      }
      if (range[1] > ahead) {
        ahead = range[1];
      }
    }

    if (ahead !== 0 && behind !== Infinity) {
      return `behind ${Math.floor(currentTime - behind)}s ~ ahead: ${Math.floor(ahead - currentTime)}s`;
    } else {
      return '';
    }
  }

  private getDate(time: number, availabilityStartTime: number): string {
    const date: Date = new Date((availabilityStartTime + time) * 1000);

    return date.toISOString();
  }

  private calculateVst(playerState: EPlayerState): void {
    if (playerState === EPlayerState.LOADING) {
      this._timer = performance.now();
    }
    if ([EPlayerState.PAUSED, EPlayerState.PLAYING].includes(playerState)) {
      this.setState({
        vst: performance.now() - this._timer
      });
    }
  }

  render(): JSX.Element {
    return (
      <div className="stats">
        <div className="stat">
          <label>State:</label>
          <span>{this.props.playerState}</span>
        </div>
        <div className="stat">
          <label>State transitions:</label>
          <span>{this.state.playerStates.join(' --> ')}</span>
        </div>
        <div className="stat">
          <label>Current time:</label>
          <span>{this.props.currentTime}</span>
        </div>
        <div className="stat">
          <label>Seekable Range:</label>
          <span>
            [{this.props.seekableRange.start} ~ {this.props.seekableRange.end}]
          </span>
        </div>
        {this.props.manifestType === EManifestType.DYNAMIC && (
          <div className="stat">
            <label>Seekable Range (Absolute):</label>
            <span>
              [{this.getDate(this.props.seekableRange.start, this.props.seekableRange.availabilityStartTime)}{' '}
              ~ {this.getDate(this.props.seekableRange.end, this.props.seekableRange.availabilityStartTime)}]
            </span>
          </div>
        )}
        <div className="stat">
          <label>Volume:</label>
          <span>{this.props.muted ? 'Muted' : this.props.volume}</span>
        </div>
        <div className="stat">
          <label>Audio bitrate:</label>
          <span>{this.props.audioBitrate.toFixed(0)} Kbps</span>
        </div>
        <div className="stat">
          <label>Video bitrate:</label>
          <span>{this.props.videoBitrate.toFixed(0)} Kbps</span>
        </div>
        <div className="stat">
          <label>Text bitrate:</label>
          <span>{this.props.textBitrate.toFixed(0)} Kbps</span>
        </div>
        <div className="stat">
          <label>Estimated bandwidth:</label>
          <span>{this.props.estimatedBandwidth.toFixed(0)} Kbps</span>
        </div>
        <div className="stat">
          <label>Audio buffer:</label>
          {this.props.audioBuffer.map((buffer: Array<number>, index: number) => (
            <span key={index}>
              [{buffer[0]} ~ {buffer[1]}]
            </span>
          ))}
        </div>
        <div className="stat">
          <label>Video buffer:</label>
          {this.props.videoBuffer.map((range: Array<number>, index: number) => (
            <span key={index}>
              [{range[0]} ~ {range[1]}]
            </span>
          ))}
        </div>
        <div className="stat">
          <label>Buffer info:</label>
          <span>{this.getBufferInfo(this.props.videoBuffer, this.props.currentTime)}</span>
        </div>
        <div className="stat">
          <label>VST:</label>
          <span>{this.state.vst.toFixed(2)} ms</span>
        </div>
        <div className="stat">
          <label>JS Memory Heap:</label>
          <span>{this.props.memoryHeap.toFixed(2)} MB</span>
        </div>
        {this.props.error && (
          <div className="stat">
            <label>Error:</label>
            <span>
              {this.props.error.code} ~ {this.props.error.message}
            </span>
          </div>
        )}
      </div>
    );
  }
}

export default Stats;
