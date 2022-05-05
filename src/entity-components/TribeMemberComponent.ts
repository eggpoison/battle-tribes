import Board from "../Board";
import Component from "../Component";
import Tribe from "../Tribe";

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
      const position = this.getEntity().getPosition();
      Board.revealFog(position, false);
   }
}

export default TribeMemberComponent;