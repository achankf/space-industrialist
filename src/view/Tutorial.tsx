import * as React from "react";
import * as Model from "../model";
import ContentPanel from "./ContentPanel";
import { BASIC_GOODS, LUXURY_GOODS } from "./productConstants";
import TitleBar from "./TitleBar";
import Window from "./Window";

export default () => {
    return <Window >
        <TitleBar title="Tutorial" />
        <ContentPanel>
            <h2>Getting Started</h2>
            Hello. <b>The game is currently paused. Follow this section and then unpause the game with the unpause button, which is located on the top-left side of the window.</b> Your first step is to colonize a food-producing (green) planet as your starting planet. Choose carefully because the first colony has a starting population of 10, and subsequent colonies will have a starting population of 1. After you're done, mouse over to the user interface, like labels,buttons, tables, to see the tooltips about game concepts. Feel free to click on any colored items on the map, as they are interactive. Also, try to change the viewport by panning and pinching, or click-and-drag and mouse wheel zooming if you are playing on a PC.

            <h2>Goal of The Game</h2>
            You are the boss of a galactic corporation. Like all corporations, your only goal is to maximize profit through selling products to consumers. As the boss, you can decide the company's funding in several ways.
            <ul>
                <li>Fund colonial ventures, control population growth</li>
                <li>Buy, expand, or destroy industrial buildings</li>
                <li>Hire traders and set up their routes</li>
                <li>Fund power plants, which are public buildings that are owned by local governments.</li>
            </ul>

            <h2>Economy</h2>
            <p>The market determines local price by demand & supply. Looking at the big picture, you want to make sure the market reaches equilibrium by matching up the galactic demand and the galactic production cap.</p>
            <p>The galactic production cap is a potential quantity that the entire galaxy can produce. However, if your industrial complexes lack input resource, they might produce goods at a lower quantity than the prod cap.</p>
            <p>Since you are the only player in the galaxy, the only way to earn money is to sell goods that are consumed by citizens [{BASIC_GOODS}, {LUXURY_GOODS}] and by power plants [{Model.Product[Model.Product.Fuel]}] -- other intermediate goods are merely transferred to your industry by your traders, e.g. when you trader sells a unit of Crop, your industry will buy it back, so no money is earned.</p>
            <p>Finally, you want to overproduce goods that are used to maintain civilian & industrial growth [Food, Fuel, Tool, Machine], instead of maintaining equilibrium. Your real cash cows are luxury goods [{LUXURY_GOODS}].</p>

            <h2>Logistics</h2>
            The galactic trade network is created by traders, which is a collection of trade routes that connect every colonized planets with minimum distance (i.e. minimum spanning tree). While you don't control traders, you can assign them to a route (a path that connects 2 plannets) of the network. If a plannet has excess goods that other planets need, traders will transport goods to those planets.

            <h2>Planet Specialization</h2>
            Planets can't be both consumers and producers, because both populations and factories use energy and therefore drive up energy price. It is possible to fund new power plants, but very costly. Thus, controlling opulation growth (see a checkbox under the planet panel) is necessary to turn planets into either dedicated <b>consumers</b> (high population, low production, pay a lot for consumable goods due to demand) or dedicated <b>producers</b> (low population, high production, produce goods at cheap price).
        </ContentPanel>
    </Window >;
};
