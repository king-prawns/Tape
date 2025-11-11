import EErrorCode from '../enum/EErrorCode';
import EErrorSeverity from '../enum/EErrorSeverity';

interface ITapeError {
  code: EErrorCode;
  message: string;
  severity: EErrorSeverity;
}

export default ITapeError;
