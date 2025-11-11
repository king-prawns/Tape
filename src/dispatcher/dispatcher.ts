/* eslint-disable @typescript-eslint/no-explicit-any */

import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import IEvents from './interfaces/IEvents';
import INativeEvents from './interfaces/INativeEvents';
import ITimedEvents from './interfaces/ITimedEvents';

class DispatcherSingleton {
  private _logger: Logger = new Logger(ELogType.DISPATCHER);
  private _videoElement: HTMLVideoElement | null = null;

  set videoElement(videoElement: HTMLVideoElement) {
    this._videoElement = videoElement;
  }

  public emit<K extends keyof IEvents>(event: IEvents[K]): void {
    const customEvent: CustomEvent = new CustomEvent(event.name, {
      detail: {
        ...event,
        currentTime: this._videoElement?.currentTime
      }
    });
    this._videoElement?.dispatchEvent(customEvent);
  }

  public on<K extends keyof ITimedEvents>(
    eventName: K,
    callback: (customEvent: ITimedEvents[K]) => void
  ): void {
    this._videoElement?.addEventListener(eventName, callback as EventListener);
  }

  public off<K extends keyof ITimedEvents>(eventName: K, callback: (event: ITimedEvents[K]) => void): void {
    this._videoElement?.removeEventListener(eventName, callback as EventListener);
  }

  public addEventListener<K extends keyof INativeEvents>(
    eventName: K,
    callback: (event: INativeEvents[K]) => void
  ): void {
    this._videoElement?.addEventListener(eventName, callback);
  }

  public removeEventListener<K extends keyof INativeEvents>(
    eventName: K,
    callback: (event: INativeEvents[K]) => void
  ): void {
    this._videoElement?.removeEventListener(eventName, callback);
  }

  public destroy(): void {
    if (!this._videoElement) return;

    this._logger.info('Destroying Dispatcher');
    // remove all the listeners
    this._videoElement.replaceWith(this._videoElement.cloneNode(true));
    this._videoElement = null;
  }
}

export const Dispatcher: DispatcherSingleton = new DispatcherSingleton();
