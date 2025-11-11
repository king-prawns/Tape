import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import getTimeSeconds from '@utils/getTimeSeconds';
import IData from '@utils/mp4/interfaces/IData';
import IParsedBox from '@utils/mp4/interfaces/IParsedBox';
import Mp4Parser from '@utils/mp4/parser';

import ICue from '../interfaces/ICue';
import IParser from '../interfaces/IParser';
import IRegion from '../interfaces/IRegion';
import IStyle from '../interfaces/IStyle';

class TtmlParser implements IParser {
  private _logger: Logger = new Logger(ELogType.PARSER);

  private buildText(textNodes: NodeList): string {
    let text: string = '';
    for (let i: number = 0; i < textNodes.length; i++) {
      const textNode: Node = textNodes[i];
      if (textNode.nodeName === 'br') {
        text += '\n';
      } else {
        text += textNode.textContent;
      }
    }

    return text;
  }

  private buildStyle(ttmlElement: HTMLElement, styleId: string): IStyle | null {
    let style: IStyle | null = null;
    const styleCollection: HTMLCollection = ttmlElement.getElementsByTagName('style');
    for (let i: number = 0; i < styleCollection.length; i++) {
      const styleElement: Element = styleCollection[i];
      const idAttr: string = styleElement.getAttribute('xml:id') || '';
      const backgroundColorAttr: string = styleElement.getAttribute('tts:backgroundColor') || '';
      const colorAttr: string = styleElement.getAttribute('tts:color') || '';
      const fontFamilyAttr: string = styleElement.getAttribute('tts:fontFamily') || '';
      const fontSizeAttr: string = styleElement.getAttribute('tts:fontSize') || '';
      const textAlignAttr: string = styleElement.getAttribute('tts:textAlign') || '';

      if (styleId === idAttr) {
        style = {
          id: idAttr,
          backgroundColor: backgroundColorAttr,
          color: colorAttr,
          fontFamily: fontFamilyAttr,
          fontSize: fontSizeAttr,
          textAlign: textAlignAttr
        };
        break;
      }
    }

    return style;
  }

  private buildRegion(ttmlElement: HTMLElement, regionId: string): IRegion | null {
    let region: IRegion | null = null;
    const regionCollection: HTMLCollection = ttmlElement.getElementsByTagName('region');
    for (let i: number = 0; i < regionCollection.length; i++) {
      const regionElement: Element = regionCollection[i];
      const idAttr: string = regionElement.getAttribute('xml:id') || '';
      const styleAttr: string = regionElement.getAttribute('style') || '';
      const displayAlignAttr: string = regionElement.getAttribute('tts:displayAlign') || '';
      const extentAttr: string = regionElement.getAttribute('tts:extent') || '';
      const originAttr: string = regionElement.getAttribute('tts:origin') || '';

      const style: IStyle | null = this.buildStyle(ttmlElement, styleAttr);

      if (regionId === idAttr) {
        region = {
          id: idAttr,
          displayAlign: displayAlignAttr,
          extent: extentAttr,
          origin: originAttr,
          styleId: styleAttr,
          style
        };
        break;
      }
    }

    return region;
  }

  private buildSubtitle(ttmlElement: HTMLElement, subtitleId: number): Array<ICue> {
    const cues: Array<ICue> = [];
    const langAttr: string = ttmlElement.getAttribute('xml:lang') || '';
    const paragraphCollection: HTMLCollection = ttmlElement.getElementsByTagName('p');

    for (let i: number = 0; i < paragraphCollection.length; i++) {
      const paragraphElement: Element = paragraphCollection[i];
      const beginAttr: string = paragraphElement.getAttribute('begin') || '';
      const endAttr: string = paragraphElement.getAttribute('end') || '';
      const regionAttr: string = paragraphElement.getAttribute('region') || '';
      const text: string = this.buildText(paragraphElement.childNodes);

      const begin: number = getTimeSeconds(beginAttr);
      const end: number = getTimeSeconds(endAttr);

      const region: IRegion | null = this.buildRegion(ttmlElement, regionAttr);

      const cue: ICue = {
        id: `${begin}_${end}_${i}`,
        subtitleId,
        position: i,
        begin,
        end,
        text,
        lang: langAttr,
        regionId: regionAttr,
        region
      };
      cues.push(cue);
    }

    return cues;
  }

  public parseMp4(data: ArrayBuffer, subtitleId: number, isInit: boolean = false): Array<ICue> {
    if (isInit) return [];

    let text: string = '';

    new Mp4Parser()
      .box('mdat', (box: IParsedBox) => {
        const parsedMdat: IData = Mp4Parser.parseData(box.reader);
        text = box.reader.uint8toString(parsedMdat.data);
      })
      .parse(data);

    return this.parseText(text, subtitleId);
  }

  public parseText(text: string, subtitleId: number): Array<ICue> {
    if (!text) return [];

    const parser: DOMParser = new DOMParser();
    const xml: Document = parser.parseFromString(text, 'text/xml');
    const ttmlElement: HTMLElement = xml.documentElement;

    return this.buildSubtitle(ttmlElement, subtitleId);
  }

  public destroy(): void {
    this._logger.info('Destroying TTML parser');
  }
}

export default TtmlParser;
