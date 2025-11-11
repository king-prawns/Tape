import EManifestType from '../enum/EManifestType';
import IContentProtection from './IContentProtection';
import IPeriod from './IPeriod';

type IManifest = {
  type: EManifestType;
  availabilityStartTime: number;
  maxSegmentDuration: number;
  mediaPresentationDuration: number;
  minBufferTime: number;
  minimumUpdatePeriod: number;
  publishTime: number;
  timeShiftBufferDepth: number;
  contentProtections: Array<IContentProtection>;
  periods: Array<IPeriod>;
};

export default IManifest;
