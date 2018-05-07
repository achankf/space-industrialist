import * as React from "react";
import { Product } from "../../../model/product";

export default ({ resource }: { resource: Product }) => {
    return <tr title="This is the type of resource that this planet can produce locally.">
        <td>Resource</td>
        <td>{Product[resource]}</td>
    </tr>;
};
