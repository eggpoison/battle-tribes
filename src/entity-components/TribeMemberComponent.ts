import Board from "../Board";
import Component from "../Component";
import Tribe from "../Tribe";
import TransformComponent from "./TransformComponent";

class TribeMemberComponent extends Component {
   public readonly tribe: Tribe;

   constructor(tribe: Tribe) {
      super();

      this.tribe = tribe;
   }

   public addExp(amount: number): void {
      this.tribe.addExp(amount);
   }

   public tick(): void {
      // Reveal any fog of war the tribe member is standing on
      const position = this.getEntity().getComponent(TransformComponent)!.position;
      const radius = (this.getEntity().SIZE as number) / 2 * Board.tileSize;
      Board.revealFog(position, radius, false);
   }
}

export default TribeMemberComponent;