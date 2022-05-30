import Component from "../../Component";
import Mouse from "../../Mouse";
import Tribe from "../../Tribe";
import { Point } from "../../utils";
import GenericTribeMember from "./GenericTribeMember";

abstract class TribeWorker extends GenericTribeMember {
   protected targetCommandPosition: Point | null = null;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super(tribe, components);

      this.createEvent("die", () => {
         this.targetCommandPosition = null;

         Mouse.removeSelectedUnit(this);
      });
   }

   public commandToPosition(target: Point): void {
      this.targetCommandPosition = target;
   }
}

export default TribeWorker;