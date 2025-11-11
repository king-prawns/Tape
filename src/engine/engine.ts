import ABRManager from '@abr/abrManager';
import CdnManager from '@cdn/cdnManager';
import {Config} from '@config/config';
import ITapeConfig from '@config/interfaces/ITapeConfig';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import ManifestDownloader from '@downloader/manifest/manifestDownloader';
import Emitter from '@emitter/emitter';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import EPlayerState from '@state/enum/EPlayerState';
import StateManager from '@state/stateManager';
import StreamManager from '@stream/streamManager';
import {Xhr} from '@xhr/xhr';

class Engine {
  private _logger: Logger = new Logger(ELogType.ENGINE);
  private _videoElement: HTMLVideoElement;
  private _mediaSource: MediaSource | null = null;
  private _emitter: Emitter | null = null;
  private _stateManager: StateManager | null = null;
  private _abrManager: ABRManager | null = null;
  private _cdnManager: CdnManager | null = null;
  private _manifestDownloader: ManifestDownloader | null = null;
  private _streamManager: StreamManager | null = null;

  constructor(private _container: HTMLDivElement, config?: ITapeConfig) {
    this._videoElement = document.createElement('video');
    this._videoElement.controls = false;
    Dispatcher.videoElement = this._videoElement;

    if (config) {
      Config.update(config);
    }

    Xhr.init();

    this.addListeners();

    if (!window.MediaSource) {
      const message: string = 'The Media Source Extensions API is not supported';
      this._logger.error(message);
      Dispatcher.emit({
        name: EEvent.TAPE_ERROR,
        message,
        code: EErrorCode.MEDIA_SOURCE_EXTENSIONS_NOT_SUPPORTED,
        severity: EErrorSeverity.FATAL
      });

      return;
    }
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.MANIFEST_READY, this.onManifestReady);
    Dispatcher.on(EEvent.TAPE_ERROR, this.onError);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.MANIFEST_READY, this.onManifestReady);
    Dispatcher.off(EEvent.TAPE_ERROR, this.onError);
  }

  private onManifestReady = (manifestReadyEvent: ITimedEvents[EEvent.MANIFEST_READY]): void => {
    if (!this._abrManager || !this._mediaSource) return;

    const {manifest} = manifestReadyEvent.detail;

    if (this._streamManager) {
      this._streamManager.updateManifest(manifest);
    } else {
      this._streamManager = new StreamManager(
        this._videoElement,
        this._abrManager,
        this._mediaSource,
        manifest
      );
    }
  };

  private onError = (tapeErrorEvent: ITimedEvents[EEvent.TAPE_ERROR]): void => {
    const {severity} = tapeErrorEvent.detail;
    if (severity === EErrorSeverity.FATAL) {
      // window.queueMicrotask(() => this.destroy());
      window.setTimeout(() => {
        this.destroy();
      }, 0);
    }
  };

  private onSourceOpen = (): void => {
    URL.revokeObjectURL(this._videoElement.src);
    this._mediaSource?.removeEventListener('sourceopen', this.onSourceOpen);

    this._logger.info('Media Source open');

    if (!this._manifestDownloader) {
      const message: string = 'Manifest parser is null';
      this._logger.error(message);
      Dispatcher.emit({
        name: EEvent.TAPE_ERROR,
        message,
        code: EErrorCode.INTERNAL,
        severity: EErrorSeverity.FATAL
      });

      return;
    }

    this._manifestDownloader.fetch();
    this._container.appendChild(this._videoElement);
  };

  public addEventListener<K extends keyof ITimedEvents>(
    eventName: K,
    callback: (event: ITimedEvents[K]) => void
  ): void {
    Dispatcher.on(eventName, callback);
  }

  public removeEventListener<K extends keyof ITimedEvents>(
    eventName: K,
    callback: (event: ITimedEvents[K]) => void
  ): void {
    Dispatcher.off(eventName, callback);
  }

  public autoplay(autoplay: boolean): void {
    this._videoElement.autoplay = autoplay;
  }

  public chooseVideoQuality(quality: number | null): void {
    this._streamManager?.updateStreamPreference(EContentType.VIDEO, quality);
  }

  public chooseAudioLanguage(lang: string): void {
    this._streamManager?.updateStreamPreference(EContentType.AUDIO, lang);
  }

  public chooseTextLanguage(lang: string | null): void {
    this._streamManager?.updateStreamPreference(EContentType.TEXT, lang);
  }

  public config(config: ITapeConfig): void {
    Config.update(config);
  }

  public enterFullscreen(): void {
    this._logger.info('Enter fullscreen');
    this._container.requestFullscreen();
  }

  public exitFullscreen(): void {
    if (document.fullscreenElement) {
      this._logger.info('Exit fullscreen');
      document.exitFullscreen();
    }
  }

  public requestPictureInPicture(): void {
    if (document.pictureInPictureEnabled) {
      this._logger.info('Request picture in picture');
      this._videoElement.requestPictureInPicture();
    }
  }

  public leavePictureInPicture(): void {
    if (document.pictureInPictureElement) {
      this._logger.info('Exit picture in picture');
      document.exitPictureInPicture();
    }
  }

  public load(manifestUrl: string): void {
    if (this._mediaSource) {
      this._logger.error('Tape is already loaded');

      return;
    }

    this._logger.info('Loading Engine');

    this._mediaSource = new MediaSource();
    this._emitter = new Emitter();
    this._stateManager = new StateManager();
    this._abrManager = new ABRManager();
    this._cdnManager = new CdnManager(manifestUrl);
    Xhr.cdnManager = this._cdnManager;
    this._manifestDownloader = new ManifestDownloader(manifestUrl);

    this._videoElement.src = URL.createObjectURL(this._mediaSource);
    this._mediaSource.addEventListener('sourceopen', this.onSourceOpen);
  }

  public mute(): void {
    this._logger.info('Mute');

    this._videoElement.muted = true;
  }

  public unmute(): void {
    this._logger.info('Unmute');

    this._videoElement.muted = false;
  }

  public volume(volume: number): void {
    let targetVolume: number = volume;
    if (volume < 0) {
      targetVolume = 0;
    } else if (volume > 1) {
      targetVolume = 1;
    }

    this._logger.info(`Set volume to ${targetVolume}`);

    this._videoElement.volume = targetVolume;
  }

  public pause(): void {
    this._logger.info('Pause');

    this._videoElement.pause();
  }

  public play(): void {
    if (!this._streamManager) return;
    this._logger.info('Play');

    const {start, end} = this._streamManager.getSeekableRange();
    if (start <= this._videoElement.currentTime && this._videoElement.currentTime <= end) {
      if (this._stateManager?.playerState !== EPlayerState.ENDED) {
        this._videoElement.play();
      } else {
        this.seekTo(start);
        this._videoElement.play();
      }
    } else {
      this._logger.debug('Play outside the seekable range');
      this.seekToLiveEdge();
      this._videoElement.play();
    }
  }

  public playbackRate(rate: number): void {
    let targetRate: number = rate;
    try {
      this._videoElement.playbackRate = targetRate;
    } catch (e) {
      targetRate = 1;
      this._videoElement.playbackRate = targetRate;
    }
    this._logger.info(`Set playback rate to ${targetRate}`);
  }

  public seek(relativeTime: number): void {
    this.seekTo(this._videoElement.currentTime + relativeTime);
  }

  public seekTo(absoluteTime: number): void {
    if (!this._streamManager || this._stateManager?.playerState === EPlayerState.LOADING) return;

    let targetTime: number = absoluteTime;
    const {start, end} = this._streamManager.getSeekableRange();
    if (absoluteTime < start) {
      targetTime = start;
    } else if (absoluteTime > end) {
      targetTime = end;
    }

    if (this._stateManager?.playerState === EPlayerState.ENDED && targetTime === end) {
      return;
    }

    this._logger.info(`Seeking to ${targetTime}s`);

    if (this._videoElement.fastSeek) {
      this._videoElement.fastSeek(targetTime);
    } else {
      this._videoElement.currentTime = targetTime;
    }
  }

  public seekToLiveEdge(): void {
    if (!this._streamManager) return;
    this.seekTo(this._streamManager.getLiveEdge());
  }

  public destroy(): void {
    if (!this._mediaSource) {
      this._logger.error('Tape is already destroyed');

      return;
    }

    this._logger.info('Destroying Engine');

    this.leavePictureInPicture();
    this.exitFullscreen();

    this.removeListeners();

    this._mediaSource = null;
    this._emitter?.destroy();
    this._emitter = null;
    this._stateManager?.destroy();
    this._stateManager = null;
    this._abrManager?.destroy();
    this._abrManager = null;
    this._cdnManager?.destroy();
    this._cdnManager = null;
    this._manifestDownloader?.destroy();
    this._manifestDownloader = null;
    this._streamManager?.destroy();
    this._streamManager = null;

    this._videoElement.src = '';
    this._videoElement.parentNode?.removeChild(this._videoElement);

    Xhr.destroy();
    Dispatcher.destroy();
  }
}

export default Engine;
