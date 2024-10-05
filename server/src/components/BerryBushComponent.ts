import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Packet } from "battletribes-shared/packets";
import { registerDirtyEntity } from "../server/player-clients";

const enum Vars {
   /** Number of seconds it takes for a berry bush to regrow one of its berries */
   BERRY_GROW_TIME = 30
}

export class BerryBushComponent {
   public numBerries = 0;
   public berryGrowTimer = 0;
}

export const BerryBushComponentArray = new ComponentArray<BerryBushComponent>(ServerComponentType.berryBush, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(berryBushComponent: BerryBushComponent, entity: EntityID): void {
   if (berryBushComponent.numBerries >= 5) {
      return;
   }

   berryBushComponent.berryGrowTimer += Settings.I_TPS;
   if (berryBushComponent.berryGrowTimer >= Vars.BERRY_GROW_TIME) {
      // Grow a new berry
      berryBushComponent.berryGrowTimer = 0;
      berryBushComponent.numBerries++;
      registerDirtyEntity(entity);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const berryComponent = BerryBushComponentArray.getComponent(entity);

   packet.addNumber(berryComponent.numBerries);
}