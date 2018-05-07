import * as React from "react";

export default ({ x, y }: { x: number, y: number }) => {
    return <tr title="This is the coordinates of the planet.">
        <td>Coor</td>
        <td>({x.toFixed(2)},{y.toFixed(2)})</td>
    </tr>;
};
