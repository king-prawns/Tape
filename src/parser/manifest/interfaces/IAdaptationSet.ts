import EContentType from '../enum/EContentType';
import EMimeType from '../enum/EMimeType';
import IRepresentation from './IRepresentation';

type IAdaptationSet = {
  contentType: EContentType;
  mimeType: EMimeType;
  id: string;
  periodId: string;
  lang: string;
  minBandwidth: number;
  maxBandwidth: number;
  representations: Array<IRepresentation>;
};

export default IAdaptationSet;
