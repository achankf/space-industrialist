import * as React from "react";

import { Colony } from "../../../model/colony";

interface EncourageGrowthProps {
  colony: Colony;
}
const EncourageGrowth: React.FC<EncourageGrowthProps> = ({ colony }) => {
  const change = (event: React.ChangeEvent<HTMLInputElement>) =>
    colony.lockPopulation(!event.target.checked);

  return (
    <tr title="This option locks the current population, and any growth on this planet will be transferred to the colonist pool. Since industrial production is not affected by population, encouraging colonists a great way to lock down power usage.">
      <td>Encourage Colonists?</td>
      <td>
        <input
          checked={!colony.lockPopulation()}
          type="checkbox"
          onChange={change}
        />
      </td>
    </tr>
  );
};

export default EncourageGrowth;
