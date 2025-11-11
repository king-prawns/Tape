import ICue from './ICue';

interface IParser {
  parseMp4(data: ArrayBuffer, subtitleId: number, isInit: boolean): Array<ICue>;
  parseText(text: string, subtitleId: number): Array<ICue>;
  destroy(): void;
}

export default IParser;
