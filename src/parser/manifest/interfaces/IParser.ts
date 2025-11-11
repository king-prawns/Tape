import IManifest from './IManifest';

interface IParser {
  parse(text: string): IManifest;
  destroy(): void;
}

export default IParser;
