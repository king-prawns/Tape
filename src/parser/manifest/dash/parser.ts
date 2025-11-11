import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import getMimeCodec from '@utils/getMimeCodec';

import EContentType from '../enum/EContentType';
import EKeySystem from '../enum/EKeySystem';
import EManifestType from '../enum/EManifestType';
import EMimeType from '../enum/EMimeType';
import ESchemeUri from '../enum/ESchemeUri';
import ETagName from '../enum/ETagName';
import IAdaptationSet from '../interfaces/IAdaptationSet';
import IContentProtection from '../interfaces/IContentProtection';
import IInbandEventStream from '../interfaces/IInbandEventStream';
import IManifest from '../interfaces/IManifest';
import IParser from '../interfaces/IParser';
import IPeriod from '../interfaces/IPeriod';
import IRepresentation from '../interfaces/IRepresentation';
import ISegment from '../interfaces/ISegment';
import ITags from '../interfaces/ITags';

const KEY_SYSTEM_MAP: Record<ESchemeUri, EKeySystem> = {
  [ESchemeUri.WIDEVINE]: EKeySystem.WIDEVINE,
  [ESchemeUri.PLAYREADY]: EKeySystem.PLAYREADY
};

class DashParser implements IParser {
  private _logger: Logger = new Logger(ELogType.PARSER);
  private _contentProtections: Array<IContentProtection> = [];

  constructor(private _manifestBaseUrl: string) {}

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const bytes: string = window.atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const result: Uint8Array = new Uint8Array(bytes.length);
    for (let i: number = 0; i < bytes.length; i++) {
      result[i] = bytes.charCodeAt(i);
    }

    return result;
  }

  private getDuration(duration: string): number {
    const pattern: string =
      '^P(?:([0-9]*)Y)?(?:([0-9]*)M)?(?:([0-9]*)D)?' + '(?:T(?:([0-9]*)H)?(?:([0-9]*)M)?(?:([0-9.]*)S)?)?$';
    const matches: RegExpExecArray | null = new RegExp(pattern).exec(duration);

    if (!matches) {
      return 0;
    }

    const years: number = Number(matches[1] ?? null);
    const months: number = Number(matches[2] ?? null);
    const days: number = Number(matches[3] ?? null);
    const hours: number = Number(matches[4] ?? null);
    const minutes: number = Number(matches[5] ?? null);
    const seconds: number = Number(matches[6] ?? null);

    const time: number =
      60 * 60 * 24 * 365 * years +
      60 * 60 * 24 * 30 * months +
      60 * 60 * 24 * days +
      60 * 60 * hours +
      60 * minutes +
      seconds;

    return time;
  }

  private getTime(time: string): number {
    if (!time) return 0;

    const date: Date = new Date(time);

    return date.getTime() / 1000;
  }

  private getContentType(mimeType: EMimeType): EContentType {
    switch (mimeType) {
      case EMimeType.APPLICATION:
      case EMimeType.TTML:
      case EMimeType.WEBVTT:
        return EContentType.TEXT;
      case EMimeType.AUDIO:
        return EContentType.AUDIO;
      case EMimeType.VIDEO:
        return EContentType.VIDEO;
    }
  }

  private getTags(htmlCollection: HTMLCollection, tagNames: Array<ETagName>): ITags {
    const tags: ITags = {} as ITags;
    for (let i: number = 0; i < tagNames.length; i++) {
      tags[tagNames[i]] = [];
    }

    for (let i: number = 0; i < htmlCollection.length; i++) {
      const element: Element = htmlCollection[i];
      if (tagNames.includes(element.tagName as ETagName)) {
        tags[element.tagName as ETagName].push(element);
      }
    }

    return tags;
  }

  private isAbsoluteUrl(url: string): boolean {
    return url.indexOf('http://') === 0 || url.indexOf('https://') === 0;
  }

  private isMimeCodecSupported(contentType: EContentType, mimeCodec: string): boolean {
    if (contentType === EContentType.AUDIO || contentType === EContentType.VIDEO) {
      const isSupported: boolean = MediaSource.isTypeSupported(mimeCodec);
      if (!isSupported) {
        const message: string = `Unsupported MIME type or codec: ${mimeCodec}`;
        this._logger.warn(message);
        Dispatcher.emit({
          name: EEvent.TAPE_ERROR,
          message,
          code: EErrorCode.MIME_TYPE_OR_CODEC_NOT_SUPPORTED,
          severity: EErrorSeverity.WARN
        });
      }

      return isSupported;
    }

    return true;
  }

  private buildManifest(mpdElement: HTMLElement): IManifest {
    const type: EManifestType = (mpdElement.getAttribute('type') as EManifestType) || EManifestType.STATIC;

    const availabilityStartTimeAttr: string = mpdElement.getAttribute('availabilityStartTime') || '';
    const availabilityStartTime: number = this.getTime(availabilityStartTimeAttr);
    const maxSegmentDurationAttr: string = mpdElement.getAttribute('maxSegmentDuration') || '';
    const maxSegmentDuration: number = this.getDuration(maxSegmentDurationAttr);
    const mediaPresentationDurationAttr: string = mpdElement.getAttribute('mediaPresentationDuration') || '';
    const mediaPresentationDuration: number = this.getDuration(mediaPresentationDurationAttr);
    const minBufferTimeAttr: string = mpdElement.getAttribute('minBufferTime') || '';
    const minBufferTime: number = this.getDuration(minBufferTimeAttr);
    const minimumUpdatePeriodAttr: string = mpdElement.getAttribute('minimumUpdatePeriod') || '';
    const minimumUpdatePeriod: number = this.getDuration(minimumUpdatePeriodAttr);
    const publishTimeAttr: string = mpdElement.getAttribute('publishTime') || '';
    const publishTime: number = this.getTime(publishTimeAttr);
    const timeShiftBufferDepthAttr: string = mpdElement.getAttribute('timeShiftBufferDepth') || '';
    const timeShiftBufferDepth: number = this.getDuration(timeShiftBufferDepthAttr);

    const tags: ITags = this.getTags(mpdElement.children, [ETagName.BASE_URL, ETagName.PERIOD]);

    let baseUrl: string = '';
    if (tags[ETagName.BASE_URL][0]) {
      baseUrl = this.buildBaseUrl(tags[ETagName.BASE_URL][0]);
    } else {
      baseUrl = this._manifestBaseUrl;
    }

    const periods: Array<IPeriod> = this.buildPeriods(tags[ETagName.PERIOD], baseUrl);

    return {
      type,
      availabilityStartTime,
      maxSegmentDuration,
      mediaPresentationDuration,
      minBufferTime,
      minimumUpdatePeriod,
      publishTime,
      timeShiftBufferDepth,
      contentProtections: [...this._contentProtections],
      periods
    };
  }

  private buildPeriods(periodElements: Array<Element>, partialBaseUrl: string): Array<IPeriod> {
    const periods: Array<IPeriod> = [];
    for (let i: number = 0; i < periodElements.length; i++) {
      const periodElement: Element = periodElements[i];
      const idAttr: string = periodElement.getAttribute('id') || '';
      const durationAttr: string = periodElement.getAttribute('duration') || '';
      const duration: number = this.getDuration(durationAttr) || Infinity;
      const startAttr: string = periodElement.getAttribute('start') || '';
      const start: number = this.getDuration(startAttr);

      const tags: ITags = this.getTags(periodElement.children, [ETagName.BASE_URL, ETagName.ADAPTATION_SET]);

      let baseUrl: string = partialBaseUrl;
      if (tags[ETagName.BASE_URL][0]) {
        baseUrl = this.buildBaseUrl(tags[ETagName.BASE_URL][0]);
        if (!this.isAbsoluteUrl(baseUrl)) {
          baseUrl = `${partialBaseUrl}${baseUrl}`;
        }
      }

      const adaptationSets: Array<IAdaptationSet> = this.buildAdaptationSets(
        tags[ETagName.ADAPTATION_SET],
        baseUrl,
        idAttr,
        start,
        duration
      );

      const video: Array<IAdaptationSet> = [];
      const audio: Array<IAdaptationSet> = [];
      const text: Array<IAdaptationSet> = [];

      for (let x: number = 0; x < adaptationSets.length; x++) {
        switch (adaptationSets[x].contentType) {
          case EContentType.VIDEO:
            video.push(adaptationSets[x]);
            break;
          case EContentType.AUDIO:
            audio.push(adaptationSets[x]);
            break;
          case EContentType.TEXT:
            text.push(adaptationSets[x]);
            break;
        }
      }

      const period: IPeriod = {
        id: idAttr,
        start,
        duration,
        video,
        audio,
        text
      };

      periods.push(period);
    }

    return periods;
  }

  private buildBaseUrl(baseUrlElement: Element): string {
    return baseUrlElement.textContent || '';
  }

  private buildAdaptationSets(
    adaptationSetElements: Array<Element>,
    partialBaseUrl: string,
    periodId: string,
    periodStart: number,
    periodDuration: number
  ): Array<IAdaptationSet> {
    const adaptationSets: Array<IAdaptationSet> = [];

    for (let i: number = 0; i < adaptationSetElements.length; i++) {
      const adaptationSetElement: Element = adaptationSetElements[i];
      const idAttr: string = adaptationSetElement.getAttribute('id') || i.toString();
      const codecsAttr: string = adaptationSetElement.getAttribute('codecs') || '';
      const langAttr: string = adaptationSetElement.getAttribute('lang') || '';
      const mimeTypeAttr: EMimeType = adaptationSetElement.getAttribute('mimeType') as EMimeType;
      let contentTypeAttr: string | null = adaptationSetElement.getAttribute('contentType') || '';
      if (!contentTypeAttr) {
        contentTypeAttr = this.getContentType(mimeTypeAttr);
      }
      const contentType: EContentType = contentTypeAttr as EContentType;
      const minBandwidthAttr: string = adaptationSetElement.getAttribute('minBandwidth') || '';
      const maxBandwidthAttr: string = adaptationSetElement.getAttribute('maxBandwidth') || '';

      if (mimeTypeAttr && codecsAttr) {
        const mimeCodec: string = getMimeCodec(mimeTypeAttr, codecsAttr);
        if (!this.isMimeCodecSupported(contentType, mimeCodec)) continue;
      }

      const tags: ITags = this.getTags(adaptationSetElement.children, [
        ETagName.REPRESENTATION,
        ETagName.SEGMENT_TEMPLATE,
        ETagName.CONTENT_PROTECTION,
        ETagName.INBAND_EVENT_STREAM
      ]);

      const baseUrl: string = partialBaseUrl;

      const segmentTemplateElement: Element | undefined = tags[ETagName.SEGMENT_TEMPLATE][0];

      const inbandEventStreams: Array<IInbandEventStream> | null = this.buildInbandEventStreams(
        tags[ETagName.INBAND_EVENT_STREAM]
      );

      const representations: Array<IRepresentation> = this.buildRepresentations(
        tags[ETagName.REPRESENTATION],
        baseUrl,
        inbandEventStreams,
        periodId,
        periodStart,
        periodDuration,
        segmentTemplateElement,
        mimeTypeAttr,
        codecsAttr,
        contentType
      );

      if (representations.length === 0) continue;

      this.buildContentProtections(tags[ETagName.CONTENT_PROTECTION]);

      adaptationSets.push({
        contentType,
        mimeType: mimeTypeAttr,
        id: idAttr,
        periodId,
        lang: langAttr,
        minBandwidth: +minBandwidthAttr,
        maxBandwidth: +maxBandwidthAttr,
        representations
      });
    }

    return adaptationSets;
  }

  private buildInbandEventStreams(
    inbandEventStreamElements: Array<Element>
  ): Array<IInbandEventStream> | null {
    if (inbandEventStreamElements.length === 0) return null;
    const inbandEventStreams: Array<IInbandEventStream> = [];

    for (let i: number = 0; i < inbandEventStreamElements.length; i++) {
      const inbandEventStreamElement: Element = inbandEventStreamElements[i];
      const schemeIdUriAttr: string = inbandEventStreamElement.getAttribute('schemeIdUri') || '';
      inbandEventStreams.push({
        schemeIdUri: schemeIdUriAttr
      });
    }

    return inbandEventStreams;
  }

  private buildRepresentations(
    representationElements: Array<Element>,
    partialBaseUrl: string,
    inbandEventStreams: Array<IInbandEventStream> | null,
    periodId: string,
    periodStart: number,
    periodDuration: number,
    adaptationSegmentTemplateElement: Element | undefined,
    adaptationMimeType: EMimeType,
    adaptationCodecs: string,
    contentType: EContentType
  ): Array<IRepresentation> {
    const representations: Array<IRepresentation> = [];

    for (let i: number = 0; i < representationElements.length; i++) {
      const representationElement: Element = representationElements[i];
      const idAttr: string = representationElement.getAttribute('id') || '';
      const bandwidthAttr: string = representationElement.getAttribute('bandwidth') || '';
      const codecsAttr: string = representationElement.getAttribute('codecs') || adaptationCodecs;

      const mimeCodec: string = getMimeCodec(adaptationMimeType, codecsAttr);
      if (!this.isMimeCodecSupported(contentType, mimeCodec)) continue;

      const tags: ITags = this.getTags(representationElement.children, [
        ETagName.SEGMENT_TEMPLATE,
        ETagName.BASE_URL
      ]);
      const representationSegmentTemplateElement: Element | undefined = tags[ETagName.SEGMENT_TEMPLATE][0];

      const baseUrlElement: Element | undefined = tags[ETagName.BASE_URL][0];
      let baseUrl: string = partialBaseUrl;
      if (baseUrlElement) {
        baseUrl = this.buildBaseUrl(baseUrlElement);
        if (!this.isAbsoluteUrl(baseUrl)) {
          baseUrl = `${partialBaseUrl}${baseUrl}`;
        }
      }

      const segments: Array<ISegment> = this.buildSegments(
        adaptationSegmentTemplateElement,
        representationSegmentTemplateElement,
        baseUrl,
        inbandEventStreams,
        idAttr,
        adaptationMimeType,
        codecsAttr,
        bandwidthAttr,
        periodId,
        periodStart,
        periodDuration,
        contentType
      );

      if (segments.length === 0) continue;

      const id: string = idAttr || i.toString();
      representations.push({
        contentType,
        mimeType: adaptationMimeType,
        id,
        periodId,
        bandwidth: +bandwidthAttr,
        codecs: codecsAttr,
        segments
      });
    }

    return representations;
  }

  private buildContentProtections(contentProtectionsElements: Array<Element>): void {
    if (contentProtectionsElements.length <= 0) return;

    const cencElement: Element = contentProtectionsElements[0];
    const keyId: string = cencElement.getAttribute('cenc:default_KID') || '';

    for (let i: number = 1; i < contentProtectionsElements.length; i++) {
      const contentProtectionElement: Element = contentProtectionsElements[i];
      const schemeIdUriAttr: string = contentProtectionElement.getAttribute('schemeIdUri') || '';
      const schemeIdUri: string = schemeIdUriAttr.toLowerCase();

      const keySystem: EKeySystem = KEY_SYSTEM_MAP[schemeIdUri as ESchemeUri];
      if (!keySystem) continue;

      let initData: Uint8Array | null = null;
      const cencPssh: Element = this.getTags(contentProtectionElement.children, [ETagName.CENC_PSSH])[
        ETagName.CENC_PSSH
      ][0];

      if (cencPssh && cencPssh.textContent) {
        initData = this.base64ToArrayBuffer(cencPssh.textContent);
      }

      const exists: boolean = Boolean(
        this._contentProtections.find((cp: IContentProtection) => {
          return cp.keyId === keyId && cp.keySystem === keySystem && cp.schemeIdUri === schemeIdUri;
        })
      );
      if (exists) return;

      this._contentProtections.push({
        initData,
        keyId,
        keySystem,
        schemeIdUri
      });
    }
  }

  private createUrl(
    baseUrl: string,
    media: string,
    reprentationId: string,
    bandwidth: string = '',
    time: string = '',
    number: string = ''
  ): string {
    const url: string = media
      .replace('$RepresentationID$', reprentationId)
      .replace('$Bandwidth$', bandwidth)
      .replace('$Time$', time)
      .replace('$Number$', number);

    if (this.isAbsoluteUrl(url)) {
      return url;
    } else {
      return `${baseUrl}${url}`;
    }
  }

  private buildSegments(
    adaptationSegmentTemplateElement: Element | undefined,
    representationTemplateElement: Element | undefined,
    baseUrl: string,
    inbandEventStreams: Array<IInbandEventStream> | null,
    representationId: string,
    adaptationsMimeType: EMimeType,
    representationCodecs: string,
    representationBandwidth: string,
    periodId: string,
    periodStart: number,
    periodDuration: number,
    contentType: EContentType
  ): Array<ISegment> {
    const timescaleAttr: string =
      adaptationSegmentTemplateElement?.getAttribute('timescale') ||
      representationTemplateElement?.getAttribute('timescale') ||
      '';
    const timescale: number = timescaleAttr ? +timescaleAttr : 0;
    const initializationAttr: string | null =
      adaptationSegmentTemplateElement?.getAttribute('initialization') ||
      representationTemplateElement?.getAttribute('initialization') ||
      '';
    const mediaAttr: string =
      adaptationSegmentTemplateElement?.getAttribute('media') ||
      representationTemplateElement?.getAttribute('media') ||
      '';
    const startNumberAttr: string =
      adaptationSegmentTemplateElement?.getAttribute('startNumber') ||
      representationTemplateElement?.getAttribute('startNumber') ||
      '';
    const startNumber: number = startNumberAttr ? +startNumberAttr : 0;
    const endNumberAttr: string =
      adaptationSegmentTemplateElement?.getAttribute('endNumber') ||
      representationTemplateElement?.getAttribute('endNumber') ||
      '';
    const endNumber: number = endNumberAttr ? +endNumberAttr : 0;
    const durationAttr: string =
      adaptationSegmentTemplateElement?.getAttribute('duration') ||
      representationTemplateElement?.getAttribute('duration') ||
      '';
    const duration: number = durationAttr ? +durationAttr : 0;
    const presentationTimeOffsetAttr: string =
      adaptationSegmentTemplateElement?.getAttribute('presentationTimeOffset') ||
      representationTemplateElement?.getAttribute('presentationTimeOffset') ||
      '';
    const presentationTimeOffset: number = presentationTimeOffsetAttr ? +presentationTimeOffsetAttr : 0;
    const mimeType: EMimeType = adaptationsMimeType;
    const codecs: string = representationCodecs;
    const offset: number = presentationTimeOffset ? presentationTimeOffset / timescale : 0;

    const segments: Array<ISegment> = [];
    let id: number = 0;
    const initialSegment: ISegment = {
      contentType,
      mimeType,
      codecs,
      id,
      url: this.createUrl(
        baseUrl,
        initializationAttr,
        representationId,
        representationBandwidth,
        undefined,
        undefined
      ),
      duration: 0,
      time: periodStart,
      offset,
      periodId,
      periodStart,
      representationId,
      inbandEventStreams: null
    };
    segments.push(initialSegment);

    const children: HTMLCollection = (adaptationSegmentTemplateElement?.children ||
      representationTemplateElement?.children) as HTMLCollection;

    if (!children) return [];

    const segmentTimelineElement: Element = this.getTags(children, [ETagName.SEGMENT_TIMELINE])[
      ETagName.SEGMENT_TIMELINE
    ][0];

    if (segmentTimelineElement) {
      const segmentElements: Array<Element> = this.getTags(segmentTimelineElement.children, [ETagName.S])[
        ETagName.S
      ];

      const tAttr: string = segmentElements[0].getAttribute('t') || '';
      let t: number = tAttr ? +tAttr : 0;
      let n: number = startNumber;
      for (let i: number = 0; i < segmentElements.length; i++) {
        const rAttr: string = segmentElements[i].getAttribute('r') || '';
        if (rAttr) {
          const r: number = +rAttr;
          for (let x: number = 0; x <= r; x++) {
            id++;

            const dAttr: string = segmentElements[i].getAttribute('d') || '';
            const d: number = dAttr ? +dAttr : 0;
            const duration: number = d / timescale;
            const time: number = (t + d) / timescale + periodStart - offset;

            const segment: ISegment = {
              contentType,
              mimeType,
              codecs,
              id,
              url: this.createUrl(
                baseUrl,
                mediaAttr,
                representationId,
                representationBandwidth,
                t.toString(),
                n.toString()
              ),
              duration,
              time,
              offset,
              periodId,
              periodStart,
              representationId,
              inbandEventStreams
            };

            t = t + d;

            segments.push(segment);
            n++;
          }
        } else {
          id++;

          const dAttr: string = segmentElements[i].getAttribute('d') || '';
          const d: number = dAttr ? +dAttr : 0;

          const duration: number = d / timescale;
          const time: number = (t + d) / timescale + periodStart - offset;
          const segment: ISegment = {
            contentType,
            mimeType,
            codecs,
            id,
            url: this.createUrl(
              baseUrl,
              mediaAttr,
              representationId,
              representationBandwidth,
              t.toString(),
              n.toString()
            ),
            duration,
            time,
            offset,
            periodId,
            periodStart,
            representationId,
            inbandEventStreams
          };

          if (segmentElements[i + 1]) {
            t = t + d;
          }

          segments.push(segment);
          n++;
        }
      }
    } else {
      let totalSegments: number = endNumber;
      const d: number = duration / timescale;
      let t: number = d;
      if (!totalSegments) {
        totalSegments = Math.ceil(periodDuration / d);
      }

      for (let i: number = 1; i <= totalSegments; i++) {
        id++;

        const segment: ISegment = {
          contentType,
          mimeType,
          codecs,
          id,
          url: this.createUrl(
            baseUrl,
            mediaAttr,
            representationId,
            representationBandwidth,
            undefined,
            i.toString()
          ),
          duration: d,
          time: t + periodStart,
          offset,
          periodId,
          periodStart,
          representationId,
          inbandEventStreams
        };

        if (i + 1 <= totalSegments) {
          t = t + d;
        }

        segments.push(segment);
      }
    }

    return segments;
  }

  public parse(text: string): IManifest {
    const parser: DOMParser = new DOMParser();
    const xml: Document = parser.parseFromString(text, 'text/xml');
    const mpdElement: HTMLElement = xml.documentElement;

    const manifest: IManifest = this.buildManifest(mpdElement);
    this._contentProtections.length = 0;

    return manifest;
  }

  public destroy(): void {
    this._logger.info('Destroying DASH parser');

    this._contentProtections.length = 0;
  }
}

export default DashParser;
