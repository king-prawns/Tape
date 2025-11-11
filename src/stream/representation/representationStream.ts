import ABRManager from '@abr/abrManager';
import IStreamConfig from '@config/interfaces/IStreamConfig';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import IRepresentation from '@parser/manifest/interfaces/IRepresentation';

class RepresentationStream {
  private _logger: Logger = new Logger(ELogType.STREAM);
  private _representation!: IRepresentation;
  private _isActive: boolean = false;

  constructor(
    private _abrManager: ABRManager,
    private _streamConfig: Required<IStreamConfig>,
    private _representations: Array<IRepresentation>,
    private _contentType: EContentType
  ) {
    this.addListeners();

    this.setRepresentation();
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.BUFFERS_UPDATE, this.onUpdateVideoRepresentation);
    Dispatcher.on(EEvent.TIME_UPDATE, this.onUpdateVideoRepresentation);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.BUFFERS_UPDATE, this.onUpdateVideoRepresentation);
    Dispatcher.off(EEvent.TIME_UPDATE, this.onUpdateVideoRepresentation);
  }

  private onUpdateVideoRepresentation = (): void => {
    if (this._contentType === EContentType.VIDEO && this._streamConfig.preferredVideoQuality === null) {
      this.chooseVideoRepresentation(false);
    }
  };

  private chooseVideoRepresentation = (onInit: boolean): void => {
    const representation: IRepresentation | null = this._abrManager.chooseVideoRepresentation(
      this._representations,
      onInit
    );
    if (representation) {
      this.setRepresentationValue(representation);
    }
  };

  private emitActiveRepresentationChange(): void {
    if (!this._representation) return;
    const {id, bandwidth, mimeType, codecs, periodId} = this._representation;
    this._logger.info(`Active ${this._contentType} representation`, {
      id,
      bandwidth,
      mimeType,
      codecs,
      periodId
    });
    Dispatcher.emit({
      name: EEvent.ACTIVE_REPRESENTATION_CHANGE,
      contentType: this._contentType,
      id,
      bandwidth,
      mimeType,
      codecs
    });
  }

  private emitChooseRepresentation(): void {
    const {id, bandwidth, mimeType, codecs, periodId} = this._representation;
    this._logger.debug(`Choose ${this._contentType} representation`, {
      id,
      bandwidth,
      mimeType,
      codecs,
      periodId
    });
    Dispatcher.emit({
      name: EEvent.CHOOSE_REPRESENTATION,
      representation: this._representation
    });
  }

  private emitAvailableTracks(): void {
    if (this._contentType === EContentType.VIDEO) {
      const tracks: Array<number> = [];
      for (let i: number = 0; i < this._representations.length; i++) {
        const representation: IRepresentation = this._representations[i];
        tracks.push(representation.bandwidth);
      }
      this._logger.info(`Available ${this._contentType} tracks`, tracks);
      Dispatcher.emit({
        name: EEvent.AVAILABLE_TRACKS,
        contentType: this._contentType,
        tracks
      });
    }
  }

  private setRepresentation(): void {
    switch (this._contentType) {
      case EContentType.VIDEO:
        this.setVideoRepresentation();
        break;
      case EContentType.AUDIO:
        this.setAudioRepresentation();
        break;
      case EContentType.TEXT:
        this.setTextRepresentation();
        break;
    }
  }

  private setAudioRepresentation(): void {
    // choose the best available video representation
    const representation: IRepresentation = this._representations.reduce(
      (r1: IRepresentation, r2: IRepresentation) => {
        return Math.max(r1.bandwidth, r2.bandwidth) === r1.bandwidth ? r1 : r2;
      }
    );
    this.setRepresentationValue(representation);
  }

  private setTextRepresentation(): void {
    const representation: IRepresentation = this._representations[0];
    this.setRepresentationValue(representation);
  }

  private setVideoRepresentation(): void {
    const {preferredVideoQuality} = this._streamConfig;
    if (preferredVideoQuality === null) {
      this.chooseVideoRepresentation(true);
    } else {
      const representation: IRepresentation = this._abrManager.chooseClosestRepresentation(
        this._representations,
        preferredVideoQuality
      );
      this.setRepresentationValue(representation);
    }
  }

  private setRepresentationValue(representation: IRepresentation): void {
    if (this._representation?.id !== representation.id) {
      this._representation = representation;
      this.emitChooseRepresentation();
      if (this._isActive) {
        this.emitActiveRepresentationChange();
      }
    }
  }

  public setActive(active: boolean): void {
    if (active) {
      this.emitAvailableTracks();
      this.emitActiveRepresentationChange();
    }
    this._isActive = active;
  }

  public destroy(): void {
    this._logger.info(`Destroying ${this._contentType} representation stream`);
    this.removeListeners();

    this._isActive = false;
  }
}

export default RepresentationStream;
