import { ServerComponentType } from "webgl-test-shared/dist/components";
import { HeatingRecipe } from "../entities/structures/cooking-entities/cooking-entity";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface CookingComponentParams {
   readonly remainingHeatSeconds: number;
}

export class CookingComponent {
   public heatingTimer = 0;
   public currentRecipe: HeatingRecipe | null = null;

   public remainingHeatSeconds = 0;

   constructor(params: CookingComponentParams) {
      this.remainingHeatSeconds = params.remainingHeatSeconds;
   }
}

export const CookingComponentArray = new ComponentArray<CookingComponent>(ServerComponentType.cooking, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);

   // Heating progress
   packet.addNumber(cookingComponent.currentRecipe !== null ? cookingComponent.heatingTimer / cookingComponent.currentRecipe.cookTime : -1);
   // Is cooking
   packet.addBoolean(cookingComponent.remainingHeatSeconds > 0);
   packet.padOffset(3);
}