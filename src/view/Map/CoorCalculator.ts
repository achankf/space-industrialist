import { add, subtract, Vec2D } from "myalgo-ts";

import { getMapCanvas } from "./constants";
import { MapUIState } from "./reducer/state";

export default class CoorCalculator {
  private canvas = getMapCanvas();
  constructor(private state: MapUIState) {}

  public centerVp(vpAt: Vec2D): Vec2D {
    const { topLeft } = this.state;
    const at = this.toGameCoor(vpAt);
    const offset = subtract(this.getCenter(), at);
    return add(topLeft, offset);
  }

  public toVpCoor([x, y]: Vec2D): Vec2D {
    const { topLeft, gridSize } = this.state;
    const [tlX, tlY] = topLeft;
    return [(x + tlX) * gridSize, (y + tlY) * gridSize];
  }

  public toGameCoor([x, y]: Vec2D): Vec2D {
    const { topLeft, gridSize } = this.state;
    const [tlX, tlY] = topLeft;
    return [x / gridSize - tlX, y / gridSize - tlY];
  }

  public getVpCenter(): Vec2D {
    const canvas = this.canvas;
    return [canvas.width / 2, canvas.height / 2];
  }

  public getCenter(): Vec2D {
    return this.toGameCoor(this.getVpCenter());
  }
}
