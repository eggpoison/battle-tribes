import { BerryBushComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Packet } from "webgl-test-shared/dist/packets";

const enum Vars {
   /** Number of seconds it takes for a berry bush to regrow one of its berries */
   BERRY_GROW_TIME = 30
}

export interface BerryBushComponentParams {}

export class BerryBushComponent {
   public numBerries = 0;
   public berryGrowTimer = 0;
}

export const BerryBushComponentArray = new ComponentArray<BerryBushComponent>(ServerComponentType.berryBush, true, {
   onTick: onTick,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_berryBush: EntityID, berryBushComponent: BerryBushComponent): void {
   if (berryBushComponent.numBerries >= 5) {
      return;
   }

   berryBushComponent.berryGrowTimer += Settings.I_TPS;
   if (berryBushComponent.berryGrowTimer >= Vars.BERRY_GROW_TIME) {
      // Grow a new berry
      berryBushComponent.berryGrowTimer = 0;
      berryBushComponent.numBerries++;
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const berryComponent = BerryBushComponentArray.getComponent(entity);

   packet.addNumber(berryComponent.numBerries);
}