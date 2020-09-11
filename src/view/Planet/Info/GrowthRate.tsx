import * as React from "react";
import { BASIC_GOODS, LUXURY_GOODS } from "../../productConstants";

interface GrowthRateProps {
  growthRate: number;
}
const GrowthRate: React.FC<GrowthRateProps> = ({ growthRate }) => {
  return (
    <tr
      title={`Growth occurs when population consumes enough food; similarly starvation occurs when citizens lack food. Bonus growth is determined by 2 major factors: 1) citizens' satisfaction of basic [${BASIC_GOODS}] and luxuary goods [${LUXURY_GOODS}], and 2) sufficient power supply.`}
    >
      <td>Annual Growth</td>
      <td>
        {growthRate > 0 ? "+" : ""}
        {Math.round(growthRate * 100)}%
      </td>
    </tr>
  );
};

export default GrowthRate;
