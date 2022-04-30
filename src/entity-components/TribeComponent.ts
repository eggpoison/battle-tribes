import Component from "../Component";
import Tribe from "../Tribe";

class TribeComponent extends Component {
   public readonly tribe: Tribe;

   constructor(tribe: Tribe) {
      super();

      this.tribe = tribe;
   }
}

export default TribeComponent;