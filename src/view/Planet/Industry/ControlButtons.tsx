import React, { useContext } from "react";
import { GameContext } from "../../../contexts/GameContext";
import { INDUSTRY_COST, INDUSTRY_DEMOLISH_COST } from "../../../model";
import { Colony } from "../../../model/colony";
import { Industry } from "../../../model/industry";

interface ControlButtonsProps {
  colony: Colony;
  industry: Industry;
}

const ControlButtons: React.FC<ControlButtonsProps> = ({
  colony,
  industry,
}) => {
  const { game } = useContext(GameContext);
  const galaxy = game.getWriter();

  function updateIndustry(e: React.MouseEvent<HTMLButtonElement>) {
    const isOk =
      e.shiftKey ||
      e.ctrlKey ||
      confirm(
        `Are you sure? This action costs $${INDUSTRY_COST} reduces operational efficiency. (press ctrl while clicking the button suppresses this message, press shift for 10 times this operation)`
      );

    if (isOk) {
      if (e.shiftKey) {
        for (let i = 0; i < 10; i++) {
          industry.upgrade();
          galaxy.withdraw(INDUSTRY_COST);
        }
      } else {
        industry.upgrade();
        galaxy.withdraw(INDUSTRY_COST);
      }
    }
  }

  function downScaleIndustry(e: React.MouseEvent<HTMLButtonElement>) {
    const isOk =
      e.shiftKey ||
      e.ctrlKey ||
      window.confirm(
        `Are you sure? This action costs $${INDUSTRY_DEMOLISH_COST} reduces operational efficiency. (press ctrl while clicking the button suppresses this message, press shift for 10 times this operation)`
      );

    if (isOk) {
      if (e.shiftKey) {
        for (let i = 0; i < 10; i++) {
          industry.downSize();
          galaxy.withdraw(INDUSTRY_DEMOLISH_COST);
        }
      } else {
        industry.downSize();
        galaxy.withdraw(INDUSTRY_DEMOLISH_COST);
      }
    }
  }

  function demolishIndustry(e: React.MouseEvent<HTMLButtonElement>) {
    const industryScale = industry.getScale();
    const demolishCost = industryScale * INDUSTRY_DEMOLISH_COST;
    const isOk =
      e.ctrlKey ||
      window.confirm(
        `Are you sure? This action costs $${demolishCost} reduces operational efficiency. (press ctrl while clicking the button suppresses this message)`
      );
    if (isOk) {
      galaxy.shutdownIndustry(colony, industry);
      galaxy.withdraw(demolishCost);
    }
  }

  return (
    <div>
      <button
        onClick={updateIndustry}
        title="expand industry (increase scale by 1)"
      >
        +
      </button>
      <button
        onClick={downScaleIndustry}
        title="down size (decrease scale by 1)"
      >
        -
      </button>
      <button
        onClick={demolishIndustry}
        title="shut down (free up the industry slot)"
      >
        X
      </button>
    </div>
  );
};

export default ControlButtons;
