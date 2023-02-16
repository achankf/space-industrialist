import * as React from "react";

interface CoorProps {
  x: number;
  y: number;
}

export const Coor: React.FC<CoorProps> = ({ x, y }) => {
  return (
    <tr title="This is the coordinates of the planet.">
      <td>Coor</td>
      <td>
        ({x.toFixed(2)},{y.toFixed(2)})
      </td>
    </tr>
  );
};
