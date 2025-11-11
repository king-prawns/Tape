import ELogLevel from '@logger/enum/ELogLevel';
import ELogType from '@logger/enum/ELogType';

interface ILoggerConfig {
  enabled?: boolean;
  level?: ELogLevel;
  include?: Array<ELogType>;
  exclude?: Array<ELogType>;
}

export default ILoggerConfig;
