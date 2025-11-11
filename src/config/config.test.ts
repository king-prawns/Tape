import ELogLevel from '@logger/enum/ELogLevel';
import ELogType from '@logger/enum/ELogType';
import EKeySystem from '@parser/manifest/enum/EKeySystem';

import {Config} from './config';

jest.mock('@logger/logger', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    info: jest.fn()
  }))
}));

describe('Config', () => {
  describe('default config', () => {
    it('should return the abr config', () => {
      expect(Config.abr).toEqual({
        switchInterval: 2000,
        minBandwidth: 0
      });
    });

    it('should return the buffer config', () => {
      expect(Config.buffer).toEqual({
        bufferAhead: 60,
        bufferBehind: 30,
        bufferOnSwitch: 5
      });
    });

    it('should return the cndn config', () => {
      expect(Config.cdn).toEqual({
        cdns: []
      });
    });

    it('should return the eme config', () => {
      expect(Config.eme).toEqual({
        keySystem: null,
        videoRobustness: [],
        audioRobustness: [],
        licenceServer: '',
        serverCertificate: null
      });
    });

    it('should return the logger config', () => {
      expect(Config.logger).toEqual({
        enabled: false,
        level: ELogLevel.WARN,
        include: [],
        exclude: []
      });
    });

    it('should return the stream config', () => {
      expect(Config.stream).toEqual({
        autoplay: false,
        preferredAudioLanguage: '',
        preferredTextLanguage: null,
        preferredVideoQuality: null,
        startingPosition: null
      });
    });

    it('should return the xhr config', () => {
      expect(Config.xhr).toEqual({
        retry: 3,
        timeout: 15000
      });
    });
  });

  describe('update', () => {
    it('should update the config', () => {
      const mockServerCertificate: Uint8Array = new Uint8Array([1]);
      Config.update({
        abr: {
          switchInterval: 1000,
          minBandwidth: 350000
        },
        buffer: {
          bufferAhead: 10,
          bufferBehind: 20,
          bufferOnSwitch: 30
        },
        cdn: {
          cdns: ['https://cdn1.com/']
        },
        eme: {
          keySystem: EKeySystem.WIDEVINE,
          videoRobustness: ['mockVideoRobustness'],
          audioRobustness: ['mockAudioRobustness'],
          licenceServer: 'mockLicenceServer',
          serverCertificate: mockServerCertificate
        },
        logger: {
          enabled: true,
          level: ELogLevel.DEBUG,
          include: [ELogType.BUFFER],
          exclude: [ELogType.CDN]
        },
        stream: {
          autoplay: true,
          preferredAudioLanguage: 'mockPreferredAudioLanguage',
          preferredTextLanguage: 'mockPreferredTextLanguage',
          preferredVideoQuality: 751000,
          startingPosition: 120
        },
        xhr: {
          retry: 10,
          timeout: 500
        }
      });

      expect(Config.abr).toEqual({
        switchInterval: 1000,
        minBandwidth: 350000
      });

      expect(Config.buffer).toEqual({
        bufferAhead: 10,
        bufferBehind: 20,
        bufferOnSwitch: 30
      });

      expect(Config.cdn).toEqual({
        cdns: ['https://cdn1.com/']
      });

      expect(Config.eme).toEqual({
        keySystem: EKeySystem.WIDEVINE,
        videoRobustness: ['mockVideoRobustness'],
        audioRobustness: ['mockAudioRobustness'],
        licenceServer: 'mockLicenceServer',
        serverCertificate: mockServerCertificate
      });

      expect(Config.logger).toEqual({
        enabled: true,
        level: ELogLevel.DEBUG,
        include: [ELogType.BUFFER],
        exclude: [ELogType.CDN]
      });

      expect(Config.stream).toEqual({
        autoplay: true,
        preferredAudioLanguage: 'mockPreferredAudioLanguage',
        preferredTextLanguage: 'mockPreferredTextLanguage',
        preferredVideoQuality: 751000,
        startingPosition: 120
      });

      expect(Config.xhr).toEqual({
        retry: 10,
        timeout: 500
      });
    });
  });
});
