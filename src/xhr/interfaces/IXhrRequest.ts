import ERequestType from '../enum/ERequestType';
import IXhrOptions from './IXhrOptions';

interface IXhrRequest {
  requestType: ERequestType;
  xhr: XMLHttpRequest;
  options?: IXhrOptions;
}

export default IXhrRequest;
