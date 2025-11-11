import EContentType from '../enum/EContentType';
import EMimeType from '../enum/EMimeType';
import ISegment from './ISegment';

interface IRepresentation {
  contentType: EContentType;
  mimeType: EMimeType;
  codecs: string;
  id: string;
  periodId: string;
  bandwidth: number;
  segments: Array<ISegment>;
}

export default IRepresentation;
