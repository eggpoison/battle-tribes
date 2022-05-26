import Board from "../Board";
import Component from "../Component";
import GenericTribeMember from "../entities/tribe-members/GenericTribeMember";
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
}

export default TribeMemberComponent;