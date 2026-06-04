import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { registerDirtyEntity } from "../server/player-clients.js";

const enum Vars {
   /** Number of seconds it takes for a berry bush to regrow one of its berries */
   BERRY_GROW_TIME = 30
}

export class BerryBushComponent {
   // @SQUEAM
   // public numBerries = 0;
   public numBerries = 5;
   public berryGrowTimer = 0;
}

export const BerryBushComponentArray = new ComponentArray<BerryBushComponent>(ServerComponentType.berryBush, true, getDataLength, addDataToPacket);
BerryBushComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(entity: Entity): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(entity);
   if (berryBushComponent.numBerries >= 5) {
      return;
   }

   berryBushComponent.berryGrowTimer += Settings.DT_S;
   if (berryBushComponent.berryGrowTimer >= Vars.BERRY_GROW_TIME) {
      // Grow a new berry
      berryBushComponent.berryGrowTimer = 0;
      berryBushComponent.numBerries++;
      registerDirtyEntity(entity);
   }
}

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const berryComponent = BerryBushComponentArray.getComponent(entity);
   packet.writeNumber(berryComponent.numBerries);
}