import EContentType from '@parser/manifest/enum/EContentType';

import EEvent from '../enum/EEvent';

interface IBufferUpdateEvent {
  name: EEvent.BUFFER_UPDATE;
  contentType: EContentType;
}

export default IBufferUpdateEvent;
