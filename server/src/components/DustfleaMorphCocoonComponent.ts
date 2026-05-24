import { CircularBox, ServerComponentType, Entity, Packet } from "battletribes-shared";
import { createKrumblidConfig } from "../entities/mobs/krumblid.js";
import { Hitbox } from "../hitboxes.js";
import { createEntity, destroyEntity, getEntityAgeTicks, getEntityLayer, ticksToGameHours } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class DustfleaMorphCocoonComponent {
   public stage = 1;
}

export const DustfleaMorphCocoonComponentArray = new ComponentArray<DustfleaMorphCocoonComponent>(ServerComponentType.dustfleaMorphCocoon, true, getDataLength, addDataToPacket);
DustfleaMorphCocoonComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getStage = (ageTicks: number): number => {
   const ageHours = ticksToGameHours(ageTicks);
   return 1 + Math.floor(ageHours / 12 * 4);
}

function onTick(cocoon: Entity): void {
   const dustfleaMorphCocoonComponent = DustfleaMorphCocoonComponentArray.getComponent(cocoon);

   const ageTicks = getEntityAgeTicks(cocoon);
   const stage = getStage(ageTicks);
   if (stage > 4) {
      destroyEntity(cocoon);

      const transformComponent = TransformComponentArray.getComponent(cocoon);
      const hitbox = transformComponent.hitboxes[0];
      
      const krumblidConfig = createKrumblidConfig(hitbox.box.posX, hitbox.box.posY, hitbox.box.angle);
      createEntity(krumblidConfig, getEntityLayer(cocoon), 0);
   } else if (stage !== dustfleaMorphCocoonComponent.stage) {
      dustfleaMorphCocoonComponent.stage = stage;

      const transformComponent = TransformComponentArray.getComponent(cocoon);
      const hitbox = transformComponent.hitboxes[0];
      (hitbox.box as CircularBox).radius += 4;
      transformComponent.isDirty = true;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const dustfleaMorphCocoonComponent = DustfleaMorphCocoonComponentArray.getComponent(entity);
   packet.writeNumber(dustfleaMorphCocoonComponent.stage);
}