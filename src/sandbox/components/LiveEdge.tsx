import './LiveEdge.css';

import React from 'react';

import {ISeekableRange} from '../..';
import SeekLiveEdge from './icons/SeekLiveEdge';

type IProps = {
  currentTime: number;
  seekableRange: ISeekableRange;
  onSeekToLiveEdge: () => void;
};
type IState = Record<string, never>;

class LiveEdge extends React.Component<IProps, IState> {
  private LIVE_EDGE: number = 30;

  constructor(props: IProps) {
    super(props);
  }

  private atLiveEdge(time: number, end: number): boolean {
    return time >= end - this.LIVE_EDGE;
  }

  render(): JSX.Element {
    return (
      <div className="live-edge">
        <span
          className={`status ${
            this.atLiveEdge(this.props.currentTime, this.props.seekableRange.end) ? 'live' : ''
          }`}
        ></span>
        <button title="seek to live edge" onClick={(): void => this.props.onSeekToLiveEdge()}>
          <SeekLiveEdge />
        </button>
      </div>
    );
  }
}

export default LiveEdge;
