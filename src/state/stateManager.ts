import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ENativeEvent from '@dispatcher/enum/ENativeEvent';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import EPlayerState from './enum/EPlayerState';

class StateManager {
  private _logger: Logger = new Logger(ELogType.STATE);
  private _playerStates: Array<EPlayerState> = [];

  constructor() {
    this.setPlayerState(EPlayerState.LOADING);
    this.addListeners();
  }

  get prevState(): EPlayerState {
    if (this._playerStates.length <= 1) return EPlayerState.UNKNOWN;

    return this._playerStates[this._playerStates.length - 2];
  }

  get playerState(): EPlayerState {
    if (!this._playerStates.length) return EPlayerState.UNKNOWN;

    return this._playerStates[this._playerStates.length - 1];
  }

  private addListeners(): void {
    Dispatcher.addEventListener(ENativeEvent.CAN_PLAY_THROUGH, this.canPlayThrough);
    Dispatcher.addEventListener(ENativeEvent.ENDED, this.onEnded);
    Dispatcher.addEventListener(ENativeEvent.PAUSE, this.onPause);
    Dispatcher.addEventListener(ENativeEvent.PLAY, this.onPlay);
    Dispatcher.addEventListener(ENativeEvent.SEEKING, this.onSeeking);
    Dispatcher.addEventListener(ENativeEvent.WAITING, this.onWaiting);
  }

  private removeListeners(): void {
    Dispatcher.removeEventListener(ENativeEvent.CAN_PLAY_THROUGH, this.canPlayThrough);
    Dispatcher.removeEventListener(ENativeEvent.ENDED, this.onEnded);
    Dispatcher.removeEventListener(ENativeEvent.PAUSE, this.onPause);
    Dispatcher.removeEventListener(ENativeEvent.PLAY, this.onPlay);
    Dispatcher.removeEventListener(ENativeEvent.SEEKING, this.onSeeking);
    Dispatcher.removeEventListener(ENativeEvent.WAITING, this.onWaiting);
  }

  private canPlayThrough = (e: Event): void => {
    const {paused} = e.target as HTMLVideoElement;
    if (paused) {
      this.setPlayerState(EPlayerState.PAUSED);
    } else {
      this.setPlayerState(EPlayerState.PLAYING);
    }
  };

  private onEnded = (_e: Event): void => {
    this.setPlayerState(EPlayerState.ENDED);
  };

  private onPause = (e: Event): void => {
    const {ended} = e.target as HTMLVideoElement;
    if (!ended) {
      this.setPlayerState(EPlayerState.PAUSED);
    }
  };

  private onPlay = (_e: Event): void => {
    this.setPlayerState(EPlayerState.PLAYING);
  };

  private onSeeking = (_e: Event): void => {
    if (this.playerState === EPlayerState.LOADING) return;
    this.setPlayerState(EPlayerState.SEEKING);
  };

  private onWaiting = (_e: Event): void => {
    this.setPlayerState(EPlayerState.BUFFERING);
  };

  private setPlayerState(playerState: EPlayerState): void {
    if (this.playerState === playerState && playerState !== EPlayerState.SEEKING) return;

    this._logger.log(`Player state changed from to ${this.playerState} to ${playerState}`);
    this._playerStates.push(playerState);

    Dispatcher.emit({
      name: EEvent.PLAYER_STATE_CHANGE,
      playerState
    });
  }

  public destroy(): void {
    this._logger.info('Destroying State manager');
    this.setPlayerState(EPlayerState.STOPPED);
    this._playerStates.length = 0;
    this.removeListeners();
  }
}

export default StateManager;
