import React, { useContext } from "react";
import { GameContext } from "../../../contexts/GameContext";
import { Industry } from "../../../model/industry";
import { Product } from "../../../model/product";
import { RAW_MATERIALS, SECONDARY_MATERIALS } from "../../constants/product";

interface IndustryDetailsProps {
  industry: Industry;
}

const IndustryDetails: React.FC<IndustryDetailsProps> = ({ industry }) => {
  const { game } = useContext(GameContext);
  const galaxy = game.getReader();
  const industryScale = industry.getScale();
  const prodCap = galaxy.prodCap(industry);
  const opEff = industry.getOperationalEff() * 100;
  const usedEnergy = galaxy.usedEnergy(industry);
  const costPerUnit = industry.getCostPerUnit();

  return (
    <div>
      <div title="Production scale is the size of your industrial complex. It determines production capacity and input consumption.">
        Production Scale: {industryScale}
      </div>
      <div title="Production capacity is the number of goods that the industrial complex can produce when running 100% efficiency and has enough input goods.">
        Production Capacity: {prodCap}
      </div>
      <div
        title={`Operational efficiency determines prod cap and the fixed cost per unit. Industrial complexes that produce raw materials [${RAW_MATERIALS}] need [${
          Product[Product.Tool]
        }] to increase eff, while secondary products [${SECONDARY_MATERIALS}] need [${
          Product[Product.Machine]
        }] to increase eff.`}
      >
        Operational Eff.: {opEff.toFixed(2)}
      </div>
      <div title="The amount of energy used by this industrial complex. The real cost is Energy Usage times Unit Price (found this in planet panel).">
        Energy Usage: {usedEnergy.toFixed(2)}
      </div>
      <div title="Fixed cost the amount of money that is used to produce a unit of product; input materials & energy cost aren't included.">
        Fixed Cost Per Unit: {costPerUnit}
      </div>
    </div>
  );
};

export default IndustryDetails;
