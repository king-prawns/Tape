import ERequestType from '@xhr/enum/ERequestType';

import EEvent from '../enum/EEvent';

interface IHttpRequestEvent {
  name: EEvent.HTTP_REQUEST;
  url: string;
  requestType: ERequestType;
}

export default IHttpRequestEvent;
