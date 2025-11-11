import IAbrConfig from './IAbrConfig';
import IBufferConfig from './IBufferConfig';
import ICdnConfig from './ICdnConfig';
import IEMEConfig from './IEmeConfig';
import ILoggerConfig from './ILoggerConfig';
import IStreamConfig from './IStreamConfig';
import IXhrConfig from './IXhrConfig';

interface ITapeConfig {
  abr?: IAbrConfig;
  buffer?: IBufferConfig;
  cdn?: ICdnConfig;
  eme?: IEMEConfig;
  logger?: ILoggerConfig;
  stream?: IStreamConfig;
  xhr?: IXhrConfig;
}

export default ITapeConfig;
