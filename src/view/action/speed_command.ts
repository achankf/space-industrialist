export enum SpeedCommandType {
  SlowDown = "SpeedCommandType_SlowDown",
  SpeedUp = "SpeedCommandType_SpeedUp",
  Resume = "SpeedCommandType_Resume",
  Pause = "SpeedCommandType_Pause",
}

export interface ISpeedCommandAction {
  type: SpeedCommandType;
}

export const speedUp = (): ISpeedCommandAction => ({
  type: SpeedCommandType.SpeedUp,
});
export const slowDown = (): ISpeedCommandAction => ({
  type: SpeedCommandType.SlowDown,
});
export const resume = (): ISpeedCommandAction => ({
  type: SpeedCommandType.Resume,
});
export const pause = (): ISpeedCommandAction => ({
  type: SpeedCommandType.Pause,
});
