import { FishColour } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { ComponentArray } from "./ComponentArray";
import { unfollowLeader } from "../entities/mobs/fish";

export class FishComponent {
   public readonly colour: FishColour;

   public flailTimer = 0;
   public secondsOutOfWater = 0;

   public leader: Entity | null = null;
   public attackTargetID = 0;

   constructor(colour: FishColour) {
      this.colour = colour;
   }
}

export const FishComponentArray = new ComponentArray<FishComponent>(true, undefined, onRemove);

function onRemove(entityID: number): void {
   // Remove the fish from its leaders' follower array
   const fishComponent = FishComponentArray.getComponent(entityID);
   if (fishComponent.leader !== null) {
      unfollowLeader(entityID, fishComponent.leader);
   }
}