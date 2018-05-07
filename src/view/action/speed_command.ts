
export enum SpeedCommandType {
    SlowDown = "SpeedCommandType_SlowDown",
    SpeedUp = "SpeedCommandType_SpeedUp",
    Resume = "SpeedCommandType_Resume",
    Pause = "SpeedCommandType_Pause",
}

export interface ISpeedCommandAction {
    type: SpeedCommandType;
}

export const speedUp = () => ({ type: SpeedCommandType.SpeedUp });
export const slowDown = () => ({ type: SpeedCommandType.SlowDown });
export const resume = () => ({ type: SpeedCommandType.Resume });
export const pause = () => ({ type: SpeedCommandType.Pause });
