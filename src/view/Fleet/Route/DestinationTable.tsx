import * as React from "react";
import { Game } from "../../../game";
import { Fleet } from "../../../model/fleet";

export default ({ fleet, game }: { fleet: Fleet, game: Game }) => {

    const galaxy = game.getReader();
    const route = fleet.getRoute();
    const at = fleet.getRouteAt();

    const destRows = fleet
        .getRoute()
        .map((stop) => {
            const homePlanet = stop.getHomePlanet();
            const [x, y] = galaxy.getCoor(homePlanet);
            const coor = `Planet ${homePlanet.id} - (${x.toFixed(2)},${y.toFixed(2)})`;

            const hasDest = route[at] === stop;
            const checkMark = hasDest ? <i className="material-icons">check</i> : undefined;
            return <tr key={coor}>
                <td>{coor}</td>
                <td>{checkMark}</td>
            </tr>;
        });

    return <table>
        <thead>
            <tr>
                <th>Place</th>
                <th>Dest</th>
            </tr>
        </thead>
        <tbody>
            {destRows}
        </tbody>
    </table>;
};
