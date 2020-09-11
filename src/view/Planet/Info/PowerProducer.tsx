import * as React from "react";

interface PowerProducerProps {
  powerPlanetLevel: number;
  fuelDemand: number;
  powerOutput: number;
  energyPrice: number;
}
const PowerProducer: React.FC<PowerProducerProps> = ({
  powerPlanetLevel,
  fuelDemand,
  powerOutput,
  energyPrice,
}) => {
  return (
    <fieldset title="The producer panel shows details about power plants of this planet.">
      <legend>Producer</legend>
      <table>
        <tbody>
          <tr title="This is the size of the power plant. Each level proportionally affects power output and fuel consumption -- the higher the level, the more power to be output and more fuel to be consumed.">
            <td>Power planet level</td>
            <td>{powerPlanetLevel}</td>
          </tr>
          <tr title="Fuel demand is the quantity needed to run the power plants at 100% efficiency. This quantity is the same as what you see in the market for fuel demand.">
            <td>Fuel demand</td>
            <td>{fuelDemand}</td>
          </tr>
          <tr title="This is the actual power output of the power plants.">
            <td>Output</td>
            <td>{powerOutput}</td>
          </tr>
          <tr title="This is how much 1 unit of energy is worth, subject to demand/supply. Both industries and civilians use power, so in the early game you might want to separate industrial planets and consumer planets.">
            <td>Unit price</td>
            <td>{energyPrice.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </fieldset>
  );
};

export default PowerProducer;
