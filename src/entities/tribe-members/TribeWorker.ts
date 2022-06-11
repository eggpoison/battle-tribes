import { Coordinates } from "../../Board";
import Component from "../../Component";
import Mouse from "../../Mouse";
import Tribe from "../../Tribe";
import Tribesman from "./Tribesman";

abstract class TribeWorker extends Tribesman {
   public targetCommandTileCoordinates: Coordinates | null = null;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super(tribe, components);

      this.createEvent("die", () => {
         this.targetCommandTileCoordinates = null;

         Mouse.removeSelectedUnit(this);
      });
   }

   public commandToTile(target: Coordinates): void {
      this.targetCommandTileCoordinates = target;
   }
}

export default TribeWorker;