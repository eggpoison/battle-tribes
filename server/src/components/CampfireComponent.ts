import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { destroyEntity } from "../world";
import { ComponentArray } from "./ComponentArray";
import { CookingComponentArray } from "./CookingComponent";

export class CampfireComponent {}

export const CampfireComponentArray = new ComponentArray<CampfireComponent>(ServerComponentType.campfire, true, getDataLength, addDataToPacket);
CampfireComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function onTick(entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);

   if (cookingComponent.remainingHeatSeconds === 0) {
      destroyEntity(entity);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}