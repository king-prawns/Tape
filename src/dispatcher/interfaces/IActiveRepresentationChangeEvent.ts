import EContentType from '@parser/manifest/enum/EContentType';
import EMimeType from '@parser/manifest/enum/EMimeType';

import EEvent from '../enum/EEvent';

interface IActiveRepresentationChangeEvent {
  name: EEvent.ACTIVE_REPRESENTATION_CHANGE;
  contentType: EContentType;
  id: string;
  bandwidth: number;
  mimeType: EMimeType;
  codecs: string;
}

export default IActiveRepresentationChangeEvent;
