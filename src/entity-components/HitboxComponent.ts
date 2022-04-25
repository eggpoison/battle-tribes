import Board from "../Board";
import Component from "../Component";
import TransformComponent from "./TransformComponent";

class HitboxComponent extends Component {
   public willCollideWithWall(): boolean {
      // Get the next position
      const transformComponent = this.getEntity().getComponent(TransformComponent);
      const currentPosition = transformComponent.position;
      const nextPosition = currentPosition.add(transformComponent.velocity.convertToPoint());

      if (nextPosition.x + transformComponent.size.width * Board.tileSize / 2 > Board.dimensions * Board.tileSize) return true;
      if (nextPosition.x - transformComponent.size.width * Board.tileSize / 2 < 0) return true;
      if (nextPosition.y + transformComponent.size.height * Board.tileSize / 2 > Board.dimensions * Board.tileSize) return true;
      if (nextPosition.y - transformComponent.size.height * Board.tileSize / 2 < 0) return true;

      return false;
   }
}

export default HitboxComponent;