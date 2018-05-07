import { ISpeedCommandAction, SpeedCommandType } from "../action/speed_command";

export interface ISpeedCommandState {
    isPaused: boolean;
    period: number;
}

const FREQUENCY_RATE = 20;

function upFrequency(oldPeriod: number) {
    return Math.max(FREQUENCY_RATE, oldPeriod - FREQUENCY_RATE);
}

function downFrequency(oldPeriod: number) {
    return Math.min(100, oldPeriod + FREQUENCY_RATE);
}

export function speedCommand(
    state: ISpeedCommandState = { isPaused: true, period: 50 },
    action: ISpeedCommandAction,
): ISpeedCommandState {
    switch (action.type) {
        case SpeedCommandType.Pause:
            return { ...state, isPaused: true };
        case SpeedCommandType.Resume:
            return { ...state, isPaused: false };
        case SpeedCommandType.SlowDown:
            return { ...state, period: downFrequency(state.period) };
        case SpeedCommandType.SpeedUp:
            return { ...state, period: upFrequency(state.period) };
        default:
            return state;
    }
}
