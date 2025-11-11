import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ENativeEvent from '@dispatcher/enum/ENativeEvent';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

class Emitter {
  private _logger: Logger = new Logger(ELogType.EMITTER);

  constructor() {
    this.addListeners();
  }

  private addListeners(): void {
    Dispatcher.addEventListener(ENativeEvent.PICTURE_IN_PICTURE_ENTER, this.onPictureInPictureEnter);
    Dispatcher.addEventListener(ENativeEvent.PICTURE_IN_PICTURE_LEAVE, this.onPictureInPictureLeave);
    Dispatcher.addEventListener(ENativeEvent.RATE_CHANGE, this.onRateChange);
    Dispatcher.addEventListener(ENativeEvent.TIME_UPDATE, this.onTimeUpdate);
    Dispatcher.addEventListener(ENativeEvent.VOLUME_CHANGE, this.onVolumeChange);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  private removeListeners(): void {
    Dispatcher.removeEventListener(ENativeEvent.PICTURE_IN_PICTURE_ENTER, this.onPictureInPictureEnter);
    Dispatcher.removeEventListener(ENativeEvent.PICTURE_IN_PICTURE_LEAVE, this.onPictureInPictureLeave);
    Dispatcher.removeEventListener(ENativeEvent.RATE_CHANGE, this.onRateChange);
    Dispatcher.removeEventListener(ENativeEvent.TIME_UPDATE, this.onTimeUpdate);
    Dispatcher.removeEventListener(ENativeEvent.VOLUME_CHANGE, this.onVolumeChange);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  private onFullscreenChange = (_e: Event): void => {
    const fullscreen: boolean = Boolean(document.fullscreenElement);
    this._logger.info(`Fullscreen changed: ${fullscreen}`);
    Dispatcher.emit({
      name: EEvent.FULLSCREEN_CHANGE,
      fullscreen
    });
  };

  private onPictureInPictureEnter = (_e: Event): void => {
    this._logger.info('Entered picture in picture');
    Dispatcher.emit({
      name: EEvent.PICTURE_IN_PICTURE_ENTER
    });
  };

  private onPictureInPictureLeave = (_e: Event): void => {
    this._logger.info('Leaved picture in picture');
    Dispatcher.emit({
      name: EEvent.PICTURE_IN_PICTURE_LEAVE
    });
  };

  private onRateChange = (e: Event): void => {
    const {playbackRate} = e.target as HTMLVideoElement;
    this._logger.info(`Playback rate changed to ${playbackRate}`);
    Dispatcher.emit({
      name: EEvent.RATE_CHANGE,
      playbackRate
    });
  };

  private onTimeUpdate = (_e: Event): void => {
    Dispatcher.emit({
      name: EEvent.TIME_UPDATE
    });
  };

  private onVolumeChange = (e: Event): void => {
    const {muted, volume} = e.target as HTMLVideoElement;
    this._logger.info(`Volume changed to ${volume}, muted: ${muted}`);
    Dispatcher.emit({
      name: EEvent.VOLUME_CHANGE,
      muted,
      volume
    });
  };

  public destroy(): void {
    this._logger.info('Destroying Emitter');
    this.removeListeners();
  }
}

export default Emitter;
