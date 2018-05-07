import * as React from "react";
import { Colony } from "../../../model";

export default ({ colony }: { colony: Colony }) => {

    let checkbox: HTMLInputElement;
    const change = () => colony.lockPopulation(!checkbox.checked);

    return <tr title="This option locks the current population, and any growth on this planet will be transferred to the colonist pool. Since industrial production is not affected by population, encouraging colonists a great way to lock down power usage.">
        <td>Encourage Colonists?</td>
        <td>
            <input
                checked={!colony.lockPopulation()}
                type="checkbox"
                ref={(node) => checkbox = node!}
                onChange={change}
            />
        </td>
    </tr>;
};
