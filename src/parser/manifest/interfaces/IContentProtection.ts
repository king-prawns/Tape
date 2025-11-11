import EKeySystem from '../enum/EKeySystem';

interface IContentProtection {
  initData: Uint8Array | null;
  keyId: string;
  keySystem: EKeySystem;
  schemeIdUri: string;
}

export default IContentProtection;
