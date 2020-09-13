import React, { useContext } from "react";
import { GameContext } from "../../contexts/GameContext";
import { Colony } from "../../model/colony";
import { allProducts, Product } from "../../model/product";
import { BASIC_GOODS, LUXURY_GOODS } from "../constants/product";

interface MarketProps {
  colony: Colony;
}

const MarketPanel: React.FC<MarketProps> = ({ colony }) => {
  const { game } = useContext(GameContext);

  const galaxy = game.getReader();
  const rows = allProducts()
    .map((product) => ({
      demand: colony.getDemand(product),
      globalDemands: galaxy.getGalacticDemands(product),
      globalProdCap: galaxy.getGalacticProdCap(product),
      globalSupply: galaxy.getGalacticSupplies(product),
      price: colony.getPrice(product),
      product,
      qty: colony.getSupply(product),
    }))
    .map((data) => (
      <tr key={data.product}>
        <td>{data.product}</td>
        <td>{Product[data.product]}</td>
        <td>{data.price.toFixed(2)}</td>
        <td>{data.qty}</td>
        <td>{data.globalDemands}</td>
        <td>{data.globalProdCap}</td>
      </tr>
    ));

  return (
    <table
      title={`The market determines local price by demand & supply. Looking at the big picture, you want to make sure the market reaches equilibrium by matching up the galactic demand and the galactic production cap.

The galactic production cap is a potential quantity that the entire galaxy can produce. However, if your industrial complexes lack input resource, they might produce goods at a lower quantity than the prod cap.

Since you are the only player in the galaxy, the only way to earn money is to sell goods that are consumed by citizens [${BASIC_GOODS}, ${LUXURY_GOODS}] and by power plants [${
        Product[Product.Fuel]
      }] -- other intermediate goods are merely transferred to your industry by your traders, e.g. when you trader sells a unit of Crop, your industry will buy it back, so no money is earned.

Finally, you want to overproduce goods that are used to maintain civilian & industrial growth [Food, Fuel, Tool, Machine], instead of maintaining equilibrium. Your real cash cows are luxury goods.`}
    >
      <thead>
        <tr>
          <th>Id</th>
          <th>Goods</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Galactic Demand</th>
          <th>Galactic ProdCap</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
};

export default MarketPanel;
