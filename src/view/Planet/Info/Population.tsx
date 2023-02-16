import * as React from "react";

import { BASIC_GOODS, LUXURY_GOODS } from "../../constants/product";

interface PopulationProps {
  num: number;
  max: number;
}

export const Population: React.FC<PopulationProps> = ({
  num,
  max,
}: {
  num: number;
  max: number;
}) => {
  return (
    <tr
      title={`A planet's population determines domestic consumption of basic goods [${BASIC_GOODS}] and luxury goods [${LUXURY_GOODS}], which is one of the 2 ways that allow you to trade goods for money (the other way being supply fuel to power plants).`}
    >
      <td>Population</td>
      <td>
        {num.toFixed(2)}/{max}
      </td>
    </tr>
  );
};
