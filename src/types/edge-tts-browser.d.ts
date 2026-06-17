declare module '@kingdanx/edge-tts-browser' {
  export default class EdgeTTSBrowser {
    static getVoices(): Promise<any>;
    tts: {
      setVoiceParams(params: {
        text: string;
        voice?: string;
        rate?: string;
        volume?: string;
        pitch?: string;
      }): void;
    };
    ttsToFile(fileName: string): Promise<Blob | Error>;
    constructor(tts?: any);
  }
}
