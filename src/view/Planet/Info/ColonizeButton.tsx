import * as React from "react";
import { Game } from "../../../game";

export default ({ colonize, game }: {
    colonize: () => void,
    game: Game,
}) => {

    const galaxy = game.getReader();
    const isDisabled = galaxy.getNumColonists() < 1;

    return <tr title="Spend 1 free colonist to colonize this planet. You can encourage growth from colonized planets.">
        <td colSpan={2}>
            <button
                onClick={colonize}
                disabled={isDisabled}
            >
                Colonize
            </button>
        </td>
    </tr>;
};
