import './Buffering.css';

import React from 'react';

import {EPlayerState} from '../..';
import Buffer from './icons/Buffer';

type IProps = {
  playerState: EPlayerState;
};
type IState = Record<string, never>;

class Buffering extends React.Component<IProps, IState> {
  render(): JSX.Element | null {
    if (
      ![EPlayerState.LOADING, EPlayerState.SEEKING, EPlayerState.BUFFERING].includes(this.props.playerState)
    ) {
      return null;
    }

    return (
      <div className="buffering">
        <div className="icon">
          <Buffer />
        </div>
      </div>
    );
  }
}

export default Buffering;
