import { EscapeAIComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface EscapeAIComponentParams {}

export class EscapeAIComponent {
   /** IDs of all entities attacking the entity */
   public readonly attackingEntityIDs = new Array<number>();
   public readonly attackEntityTicksSinceLastAttack = new Array<number>();
}

export const EscapeAIComponentArray = new ComponentArray<ServerComponentType.escapeAI, EscapeAIComponent>(true, {
   serialise: serialise
});

export function updateEscapeAIComponent(escapeAIComponent: EscapeAIComponent, attackSubsideTicks: number): void {
   for (let i = 0; i < escapeAIComponent.attackingEntityIDs.length; i++) {
      if (escapeAIComponent.attackEntityTicksSinceLastAttack[i]++ >= attackSubsideTicks) {
         escapeAIComponent.attackingEntityIDs.splice(i, 1);
         escapeAIComponent.attackEntityTicksSinceLastAttack.splice(i, 1);
         i--;
      }
   }
}

function serialise(entityID: number): EscapeAIComponentData {
   const escapeAIComponent = EscapeAIComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.escapeAI,
      attackingEntityIDs: escapeAIComponent.attackingEntityIDs,
      attackEntityTicksSinceLastAttack: escapeAIComponent.attackEntityTicksSinceLastAttack
   };
}