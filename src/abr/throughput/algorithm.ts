import IAlgorithm from '@abr/interfaces/IAlgorithm';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import EErrorCode from '@error/enum/EErrorCode';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import IRepresentation from '@parser/manifest/interfaces/IRepresentation';
import ERequestType from '@xhr/enum/ERequestType';

// Spike EWMA bandwidth estimator
class Throughput implements IAlgorithm {
  private _logger: Logger = new Logger(ELogType.ABR);
  private _estimatedBandwidth: number = 0;

  private _PERCENTAGE: number = 80 / 100;
  private _MIN_BYTES: number = 16e3; // 16 KB

  constructor() {
    this.addListeners();
  }

  get estimatedBandwidth(): number {
    return this._estimatedBandwidth;
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.HTTP_RESPONSE, this.onHttpResponse);
    Dispatcher.on(EEvent.TAPE_ERROR, this.onError);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.HTTP_RESPONSE, this.onHttpResponse);
    Dispatcher.off(EEvent.TAPE_ERROR, this.onError);
  }

  private onError = (tapeErrorEvent: ITimedEvents[EEvent.TAPE_ERROR]): void => {
    const {code} = tapeErrorEvent.detail;
    if (code === EErrorCode.XHR_TIMEOUT) {
      this._estimatedBandwidth = 0;
    }
  };

  private onHttpResponse = (httpResponseEvent: ITimedEvents[EEvent.HTTP_RESPONSE]): void => {
    const {requestType, timeMs, bytes} = httpResponseEvent.detail;
    if (requestType !== ERequestType.MANIFEST && bytes <= this._MIN_BYTES) {
      this._logger.debug(`ignoring sample of ${bytes}bytes because is lesser than ${this._MIN_BYTES}bytes`);

      return;
    }

    switch (requestType) {
      case ERequestType.LICENSE:
      case ERequestType.TEXT_SEGMENT:
      case ERequestType.AUDIO_SEGMENT:
        this._logger.debug(`ignoring ${requestType} request`);

        return;
      case ERequestType.MANIFEST:
        if (this._estimatedBandwidth) return;
        break;
      case ERequestType.VIDEO_SEGMENT:
        break;
    }

    if ('connection' in window.navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._estimatedBandwidth = (window.navigator as any).connection.downlink * 1000 * 1000;
    } else {
      const bit: number = bytes * 8;
      const timeSec: number = timeMs / 1000;
      const bps: number = bit / timeSec;
      this._estimatedBandwidth = bps;
    }

    this._logger.debug(
      `Estimated bandwidth: ${(this._estimatedBandwidth / 1000).toFixed(0)} Kbps`,
      requestType
    );

    Dispatcher.emit({
      name: EEvent.ESTIMATED_BANDWIDTH,
      estimatedBandwidth: this._estimatedBandwidth
    });
  };

  public chooseRepresentation(representations: Array<IRepresentation>): IRepresentation {
    const maxBandwidth: number = this._estimatedBandwidth * this._PERCENTAGE;

    for (let i: number = representations.length - 1; i >= 0; i--) {
      const representation: IRepresentation = representations[i];
      if (representation.bandwidth <= maxBandwidth) {
        return representation;
      }
    }

    return representations[0];
  }

  public destroy(): void {
    this._logger.info('Destroying Throughput algorithm');

    this.removeListeners();

    this._estimatedBandwidth = 0;
  }
}

export default Throughput;
