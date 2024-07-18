import { EntityID, FishColour } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { unfollowLeader } from "../entities/mobs/fish";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Packet } from "webgl-test-shared/dist/packets";

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

export const FishComponentArray = new ComponentArray<FishComponent>(ServerComponentType.fish, true, {
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onRemove(entity: EntityID): void {
   // Remove the fish from its leaders' follower array
   const fishComponent = FishComponentArray.getComponent(entity);
   if (fishComponent.leader !== null) {
      unfollowLeader(entity, fishComponent.leader);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const fishComponent = FishComponentArray.getComponent(entity);

   packet.addNumber(fishComponent.colour);
}