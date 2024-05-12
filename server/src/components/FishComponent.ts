import { FishColour } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";

export class FishComponent {
   public readonly colour: FishColour;

   public flailTimer = 0;
   public secondsOutOfWater = 0;

   public leader: Entity | null = null;
   public attackTarget: Entity | null = null;

   constructor(colour: FishColour) {
      this.colour = colour;
   }
}