import { Coordinates } from "../../Board";
import Component from "../../Component";
import Mouse from "../../Mouse";
import Tribe from "../../Tribe";
import GenericTribeMember from "./GenericTribeMember";

abstract class TribeWorker extends GenericTribeMember {
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