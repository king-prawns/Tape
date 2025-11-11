import ITapeConfig from '@config/interfaces/ITapeConfig';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import Engine from '@engine/engine';

class Tape {
  private _engine: Engine;

  constructor(private _container: HTMLDivElement, config?: ITapeConfig) {
    this._engine = new Engine(this._container, config);
  }

  public addEventListener<K extends keyof ITimedEvents>(
    eventName: K,
    callback: (event: ITimedEvents[K]) => void
  ): void {
    this._engine.addEventListener(eventName, callback);
  }

  public removeEventListener<K extends keyof ITimedEvents>(
    eventName: K,
    callback: (event: ITimedEvents[K]) => void
  ): void {
    this._engine.removeEventListener(eventName, callback);
  }

  public autoplay(autoplay: boolean): void {
    this._engine.autoplay(autoplay);
  }

  public chooseVideoQuality(quality: number | null): void {
    this._engine.chooseVideoQuality(quality);
  }

  public chooseAudioLanguage(lang: string): void {
    this._engine.chooseAudioLanguage(lang);
  }

  public chooseTextLanguage(lang: string | null): void {
    this._engine.chooseTextLanguage(lang);
  }

  public config(config: ITapeConfig): void {
    this._engine.config(config);
  }

  public enterFullscreen(): void {
    this._engine.enterFullscreen();
  }

  public requestPictureInPicture(): void {
    this._engine.requestPictureInPicture();
  }

  public leavePictureInPicture(): void {
    this._engine.leavePictureInPicture();
  }

  public exitFullscreen(): void {
    this._engine.exitFullscreen();
  }

  public load(manifestUrl: string): void {
    this._engine.load(manifestUrl);
  }

  public mute(): void {
    this._engine.mute();
  }

  public unmute(): void {
    this._engine.unmute();
  }

  public volume(volume: number): void {
    this._engine.volume(volume);
  }

  public pause(): void {
    this._engine.pause();
  }

  public play(): void {
    this._engine.play();
  }

  public playbackRate(rate: number): void {
    this._engine.playbackRate(rate);
  }

  public seek(relativeTime: number): void {
    this._engine.seek(relativeTime);
  }

  public seekTo(absoluteTime: number): void {
    this._engine.seekTo(absoluteTime);
  }

  public seekToLiveEdge(): void {
    this._engine.seekToLiveEdge();
  }

  public destroy(): void {
    this._engine.destroy();
  }
}

export default Tape;
