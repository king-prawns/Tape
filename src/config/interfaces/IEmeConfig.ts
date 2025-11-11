import EKeySystem from '@parser/manifest/enum/EKeySystem';

interface IEMEConfig {
  keySystem?: EKeySystem | null;
  videoRobustness?: Array<string>;
  audioRobustness?: Array<string>;
  licenceServer?: string;
  serverCertificate?: Uint8Array | null;
}

export default IEMEConfig;
