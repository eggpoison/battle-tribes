import Board from "../Board";
import Component from "../Component";
import TransformComponent from "./TransformComponent";

interface BaseHitboxInfo {
   readonly type: "rectangle" | "circle";
}

interface RectangleHitboxInfo extends BaseHitboxInfo {
   readonly type: "rectangle";
   readonly width: number;
   readonly height: number;
}

export interface CircleHitboxInfo extends BaseHitboxInfo {
   readonly type: "circle";
   readonly radius: number;
}

type HitboxInfo = CircleHitboxInfo | RectangleHitboxInfo;

class HitboxComponent extends Component {
   public readonly hitboxInfo: HitboxInfo;

   constructor(hitboxInfo: HitboxInfo) {
      super();

      this.hitboxInfo = hitboxInfo;
   }

   public willCollideWithWall(): boolean {
      // Get the next position
      const transformComponent = this.getEntity().getComponent(TransformComponent)!;
      const currentPosition = transformComponent.position;
      const nextPosition = currentPosition.add(transformComponent.velocity.convertToPoint());

      // Check if the entity will collide with the wall
      switch (this.hitboxInfo.type) {
         case "circle": {
            if (nextPosition.x + this.hitboxInfo.radius * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.x - this.hitboxInfo.radius * Board.tileSize < 0) return true;
            if (nextPosition.y + this.hitboxInfo.radius * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.y - this.hitboxInfo.radius * Board.tileSize < 0) return true;
            break;
         }
         case "rectangle": {
            if (nextPosition.x + this.hitboxInfo.width / 2 * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.x - this.hitboxInfo.width / 2 * Board.tileSize < 0) return true;
            if (nextPosition.y + this.hitboxInfo.height / 2 * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.y - this.hitboxInfo.height / 2 * Board.tileSize < 0) return true;
            break;
         }
      }

      return false;
   }
}

export default HitboxComponent;