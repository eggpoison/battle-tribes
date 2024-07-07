import { EntityID, FishColour } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { unfollowLeader } from "../entities/mobs/fish";
import { FishComponentData, ServerComponentType } from "webgl-test-shared/dist/components";

export interface FishComponentParams {
   readonly colour: FishColour;
}

export class FishComponent {
   public readonly colour: FishColour;

   public flailTimer = 0;
   public secondsOutOfWater = 0;

   public leader: EntityID | null = null;
   public attackTargetID = 0;

   constructor(params: FishComponentParams) {
      this.colour = params.colour;
   }
}

export const FishComponentArray = new ComponentArray<ServerComponentType.fish, FishComponent>(true, {
   onRemove: onRemove,
   serialise: serialise
});

function onRemove(entity: EntityID): void {
   // Remove the fish from its leaders' follower array
   const fishComponent = FishComponentArray.getComponent(entity);
   if (fishComponent.leader !== null) {
      unfollowLeader(entity, fishComponent.leader);
   }
}

function serialise(entity: EntityID): FishComponentData {
   const fishComponent = FishComponentArray.getComponent(entity);
   return {
      componentType: ServerComponentType.fish,
      colour: fishComponent.colour
   };
}