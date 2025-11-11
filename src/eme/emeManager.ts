import {Config} from '@config/config';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ENativeEvent from '@dispatcher/enum/ENativeEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EKeySystem from '@parser/manifest/enum/EKeySystem';
import IContentProtection from '@parser/manifest/interfaces/IContentProtection';
import ERequestType from '@xhr/enum/ERequestType';
import {Xhr} from '@xhr/xhr';

const EME_DEFAULT_WIDEVINE_ROBUSTNESSES: Array<string> = [
  'HW_SECURE_ALL',
  'HW_SECURE_DECODE',
  'HW_SECURE_CRYPTO',
  'SW_SECURE_DECODE',
  'SW_SECURE_CRYPTO'
];

const VIDEO_MIME_CODEC: Array<string> = [
  'video/mp4;codecs="avc1.4d401e"',
  'video/mp4;codecs="avc1.42e01e"',
  'video/webm;codecs="vp8"'
];

const AUDIO_MIME_CODEC: Array<string> = ['audio/mp4;codecs="mp4a.40.2"', 'audio/webm;codecs=opus'];

class EMEManager {
  private _logger: Logger = new Logger(ELogType.EME);
  private _mediakeySession: MediaKeySession | null = null;
  private _initData: ArrayBuffer | null = null;
  private _initDataType: string | null = null;
  private _licenseUpdates: number = 0;

  constructor(
    private _videoElement: HTMLVideoElement,
    private _contentProtections: Array<IContentProtection>
  ) {
    this._logger.info('Content protections', this._contentProtections);

    this.addListeners();
  }

  private addListeners(): void {
    Dispatcher.addEventListener(ENativeEvent.ENCRYPTED, this.onEncrypted);
    Dispatcher.on(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private removeListeners(): void {
    Dispatcher.removeEventListener(ENativeEvent.ENCRYPTED, this.onEncrypted);
    Dispatcher.off(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private onEncrypted = (e: MediaEncryptedEvent): void => {
    Dispatcher.removeEventListener(ENativeEvent.ENCRYPTED, this.onEncrypted);
    const {initData, initDataType} = e;
    if (initDataType !== 'cenc' || !initData) return;
    this._logger.log(`Encrypted event: ${initDataType}`, initData);

    this._initData = ArrayBuffer.isView(initData) ? initData.buffer : initData;
    this._initDataType = initDataType;

    this.generateRequest();
  };

  private onHttpResponse = (httpResponseEvent: ITimedEvents[EEvent.HTTP_RESPONSE]): void => {
    const {requestType} = httpResponseEvent.detail;
    if (requestType !== ERequestType.LICENSE) return;

    const {data} = httpResponseEvent.detail;
    const license: Uint8Array = new Uint8Array(data as ArrayBuffer);

    this._mediakeySession
      ?.update(license)
      .then(() => {
        this._licenseUpdates++;
        this._logger.debug('Message/licence loaded successfully');

        // TODO: improve logic
        if (this._licenseUpdates === 2) {
          Dispatcher.emit({
            name: EEvent.EME_READY
          });
        }
      })
      .catch((err: Error) => {
        const message: string = 'update() failed';
        this._logger.error(message, err);
        Dispatcher.emit({
          name: EEvent.TAPE_ERROR,
          message,
          code: EErrorCode.MEDIA_KEY_SESSION_UPDATE,
          severity: EErrorSeverity.FATAL
        });
      });
  };

  private onMessage = (e: MediaKeyMessageEvent): void => {
    this._logger.log(`Media key message event: ${e.messageType}`, e.message);
    Xhr.request(Config.eme.licenceServer, ERequestType.LICENSE, {
      method: 'POST',
      body: e.message
    });
  };

  private generateRequest(): void {
    if (!this._mediakeySession || !this._initData || !this._initDataType) return;

    this._logger.log(`Generate '${this._initDataType}' request`, this._initData);

    this._mediakeySession
      .generateRequest(this._initDataType, this._initData)
      .then(() => {
        this._logger.debug('Media request generated successfully');
      })
      .catch((err: Error) => {
        const message: string = 'Unable to create or initialize key session';
        this._logger.error(message, err);
        Dispatcher.emit({
          name: EEvent.TAPE_ERROR,
          message,
          code: EErrorCode.INITIALIZE_KEY_SESSION,
          severity: EErrorSeverity.FATAL
        });
      });
  }

  public init(): void {
    const keySystem: EKeySystem | null = Config.eme.keySystem;

    const contentProtection: IContentProtection = this._contentProtections.filter(
      (cp: IContentProtection) => cp.keySystem === keySystem
    )[0];

    if (!contentProtection) {
      const message: string = `No content protection found for '${keySystem}' key system`;
      this._logger.error(message);

      Dispatcher.emit({
        name: EEvent.TAPE_ERROR,
        code: EErrorCode.CONTENT_PROTECTION_NOT_FOUND,
        severity: EErrorSeverity.FATAL,
        message
      });

      return;
    }

    if (contentProtection.initData) {
      // we can encrypt using the init data, not need to wait for an encrypted event
      Dispatcher.removeEventListener(ENativeEvent.ENCRYPTED, this.onEncrypted);
    } else {
      Dispatcher.emit({
        name: EEvent.EME_READY
      });
    }

    let videoRobustnesses: Array<string> = [...Config.eme.videoRobustness];
    if (videoRobustnesses.length === 0 && keySystem === EKeySystem.WIDEVINE) {
      videoRobustnesses = [...EME_DEFAULT_WIDEVINE_ROBUSTNESSES];
    }

    let audioRobustnesses: Array<string> = [...Config.eme.audioRobustness];
    if (audioRobustnesses.length === 0 && keySystem === EKeySystem.WIDEVINE) {
      audioRobustnesses = [...EME_DEFAULT_WIDEVINE_ROBUSTNESSES];
    }

    let videoCapabilities: Array<MediaKeySystemMediaCapability> = [];
    if (videoRobustnesses.length === 0) {
      videoCapabilities = VIDEO_MIME_CODEC.map((mimeCodec: string) => ({
        contentType: mimeCodec
      }));
    } else {
      for (let i: number = 0; i < videoRobustnesses.length; i++) {
        for (let y: number = 0; y < VIDEO_MIME_CODEC.length; y++) {
          videoCapabilities.push({
            contentType: VIDEO_MIME_CODEC[y],
            robustness: videoRobustnesses[i]
          });
        }
      }
    }

    let audioCapabilities: Array<MediaKeySystemMediaCapability> = [];
    if (audioRobustnesses.length === 0) {
      audioCapabilities = AUDIO_MIME_CODEC.map((mimeCodec: string) => ({
        contentType: mimeCodec
      }));
    } else {
      for (let i: number = 0; i < audioRobustnesses.length; i++) {
        for (let y: number = 0; y < AUDIO_MIME_CODEC.length; y++) {
          audioCapabilities.push({
            contentType: AUDIO_MIME_CODEC[y],
            robustness: audioRobustnesses[i]
          });
        }
      }
    }

    const mediaKeySystemConfiguration: Array<MediaKeySystemConfiguration> = [
      {
        videoCapabilities,
        audioCapabilities
      }
    ];

    this._logger.log(`Request media key system access: ${keySystem}`, mediaKeySystemConfiguration);

    navigator
      .requestMediaKeySystemAccess(contentProtection.keySystem, mediaKeySystemConfiguration)
      .then((keySystemAccess: MediaKeySystemAccess) => {
        this._logger.log('Create media keys');
        keySystemAccess
          .createMediaKeys()
          .then((createdMediaKeys: MediaKeys) => {
            if (Config.eme.serverCertificate) {
              this._logger.log('Set server certificate', Config.eme.serverCertificate);
              createdMediaKeys.setServerCertificate(Config.eme.serverCertificate);
            }

            this._logger.log('Set media keys', createdMediaKeys);
            this._videoElement.setMediaKeys(createdMediaKeys);

            this._mediakeySession = createdMediaKeys.createSession();
            this._mediakeySession.addEventListener('message', this.onMessage);

            if (contentProtection.initData) {
              this._initData = contentProtection.initData.buffer;
              this._initDataType = 'cenc';
            }
            this.generateRequest();
          })
          .catch((err: Error) => {
            const message: string = 'Unable to create MediaKeys';
            this._logger.error(message, err);
            Dispatcher.emit({
              name: EEvent.TAPE_ERROR,
              message,
              code: EErrorCode.CREATE_MEDIA_KEYS,
              severity: EErrorSeverity.FATAL
            });
          });
      })
      .catch((err: Error) => {
        const message: string = 'Request media key system access failed';
        this._logger.error(message, err);
        Dispatcher.emit({
          name: EEvent.TAPE_ERROR,
          message,
          code: EErrorCode.REQUEST_MEDIA_KEY_ACCESS,
          severity: EErrorSeverity.FATAL
        });
      });
  }

  public destroy(): void {
    this._logger.info('Destroying EME manager');
    this.removeListeners();

    this._contentProtections.length = 0;
    this._mediakeySession?.removeEventListener('message', this.onMessage);
    this._mediakeySession = null;
    this._initData = null;
    this._initDataType = null;
    this._licenseUpdates = 0;
    this._videoElement.setMediaKeys(null);
  }
}

export default EMEManager;
