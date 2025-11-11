import ERequestType from '@xhr/enum/ERequestType';

import EEvent from '../enum/EEvent';

interface IHttpResponseEvent {
  name: EEvent.HTTP_RESPONSE;
  url: string;
  requestType: ERequestType;
  data: unknown;
  timeMs: number;
  bytes: number;
}

export default IHttpResponseEvent;
