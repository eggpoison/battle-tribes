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
}

export default TribeMemberComponent;