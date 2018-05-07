import * as React from "react";

export default ({ industrialUsage, traderUsage, civUsage }: { industrialUsage: number, traderUsage: number, civUsage: number }) => {
    return <fieldset title="The consumer panel shows details about *POTENTIAL* energy consumption on this planet. If the planet has a shortage, energy will be distributed evenly with best effort.">
        <legend>Consumer</legend>
        <table>
            <tbody>
                <tr title="This is the maximum energy that your industrial complexes need.">
                    <td>Industry</td>
                    <td>{industrialUsage}</td>
                </tr>
                <tr title="This is the maximum energy that your traders need.">
                    <td>Trader</td>
                    <td>{traderUsage}</td>
                </tr>
                <tr title="This is the maximum energy that the local population needs.">
                    <td>Civilian</td>
                    <td>{civUsage}</td>
                </tr>
            </tbody>
        </table>
    </fieldset>;
};
