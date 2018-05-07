import * as Immutable from "immutable";
import * as React from "react";
import * as Model from "../../model";

interface ICargo {
    fleet: Model.Fleet;
}

export default class Cargo extends React.Component<ICargo> {

    public render() {
        const fleet = this.props.fleet;

        const rows = Immutable
            .Seq(fleet.getCargo().getAllQty())
            .filter(([qty]) => qty > 0)
            .map(([product, qty]) => <tr key={product}>
                <td>{Model.Product[product]}</td>
                <td>{qty}</td>
            </tr>);

        return <table>
            <thead>
                <tr>
                    <th>Product Type</th>
                    <th>Qty</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>;
    }
}
