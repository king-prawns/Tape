import ABRManager from '@abr/abrManager';
import IStreamConfig from '@config/interfaces/IStreamConfig';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import IAdaptationSet from '@parser/manifest/interfaces/IAdaptationSet';

import RepresentationStream from '../representation/representationStream';

class AdaptationStream {
  private _logger: Logger = new Logger(ELogType.STREAM);
  private _adaptation: IAdaptationSet | null = null;
  private _representationStream: RepresentationStream | null = null;
  private _isActive: boolean = false;

  constructor(
    private _abrManager: ABRManager,
    private _streamConfig: Required<IStreamConfig>,
    private _adaptations: Array<IAdaptationSet>,
    private _contentType: EContentType
  ) {
    this.setAdaptation();

    this.createRepresentationStream();
  }

  private createRepresentationStream(): void {
    if (this._adaptation) {
      this._representationStream = new RepresentationStream(
        this._abrManager,
        this._streamConfig,
        this._adaptation.representations,
        this._contentType
      );
    }
  }

  private emitActiveAdaptationChange(): void {
    const id: string | null = this._adaptation?.id ?? null;
    const lang: string | null = this._adaptation?.lang ?? null;
    const periodId: string | null = this._adaptation?.periodId ?? null;

    this._logger.info(`Active ${this._contentType} adaptation`, {
      id,
      lang,
      periodId
    });
    Dispatcher.emit({
      name: EEvent.ACTIVE_ADAPTATION_CHANGE,
      contentType: this._contentType,
      id,
      lang
    });
  }

  private emitAvailableTracks(): void {
    switch (this._contentType) {
      case EContentType.AUDIO:
      case EContentType.TEXT: {
        const tracks: Array<string> = [];
        for (let i: number = 0; i < this._adaptations.length; i++) {
          const adaptation: IAdaptationSet = this._adaptations[i];
          tracks.push(adaptation.lang);
        }
        this._logger.info(`Available ${this._contentType} tracks`, tracks);
        Dispatcher.emit({
          name: EEvent.AVAILABLE_TRACKS,
          contentType: this._contentType,
          tracks
        });
      }
    }
  }

  private setAdaptation(): void {
    switch (this._contentType) {
      case EContentType.VIDEO:
        this.setVideoAdaptation();
        break;
      case EContentType.AUDIO:
        this.setAudioAdaptation();
        break;
      case EContentType.TEXT:
        this.setTextAdaptation();
        break;
    }
  }

  private setAudioAdaptation(): void {
    const {preferredAudioLanguage} = this._streamConfig;

    const adaptation: IAdaptationSet =
      this._adaptations.find((adaptionSet: IAdaptationSet) => adaptionSet.lang === preferredAudioLanguage) ??
      this._adaptations[0];
    this.setAdaptationValue(adaptation);
  }

  private setTextAdaptation(): void {
    const {preferredTextLanguage} = this._streamConfig;

    const adaptation: IAdaptationSet | null =
      this._adaptations.find((adaptionSet: IAdaptationSet) => adaptionSet.lang === preferredTextLanguage) ??
      null;
    this.setAdaptationValue(adaptation);
  }

  private setVideoAdaptation(): void {
    // choose the best available video adaptation
    const adaptation: IAdaptationSet = this._adaptations.reduce((a1: IAdaptationSet, a2: IAdaptationSet) => {
      return Math.max(a1.maxBandwidth, a2.maxBandwidth) === a1.maxBandwidth ? a1 : a2;
    });
    this.setAdaptationValue(adaptation);
  }

  private setAdaptationValue(adaptation: IAdaptationSet | null): void {
    this._adaptation = adaptation;

    const id: string | null = this._adaptation?.id ?? null;
    const lang: string | null = this._adaptation?.lang ?? null;
    const periodId: string | null = this._adaptation?.periodId ?? null;
    this._logger.debug(`Choose ${this._contentType} adaptation`, {
      id,
      lang,
      periodId
    });
    if (this._isActive) {
      this.emitActiveAdaptationChange();
    }
  }

  public setActive(active: boolean): void {
    if (active) {
      this.emitAvailableTracks();
      this.emitActiveAdaptationChange();
    }
    this._isActive = active;
    this._representationStream?.setActive(this._isActive);
  }

  public destroy(): void {
    this._logger.info(`Destroying ${this._contentType} adaptation stream`);

    this._adaptation = null;
    this._representationStream?.destroy();
    this._representationStream = null;
    this._isActive = false;
  }
}

export default AdaptationStream;
