import { EscapeAIComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { EscapeAIComponentArray } from "./ComponentArray";

export class EscapeAIComponent {
   /** IDs of all entities attacking the entity */
   public readonly attackingEntityIDs = new Array<number>();
   public readonly attackEntityTicksSinceLastAttack = new Array<number>();
}

export function updateEscapeAIComponent(escapeAIComponent: EscapeAIComponent, attackSubsideTicks: number): void {
   for (let i = 0; i < escapeAIComponent.attackingEntityIDs.length; i++) {
      if (escapeAIComponent.attackEntityTicksSinceLastAttack[i]++ >= attackSubsideTicks) {
         escapeAIComponent.attackingEntityIDs.splice(i, 1);
         escapeAIComponent.attackEntityTicksSinceLastAttack.splice(i, 1);
         i--;
      }
   }
}

export function serialiseEscapeAIComponent(entity: Entity): EscapeAIComponentData {
   const escapeAIComponent = EscapeAIComponentArray.getComponent(entity.id);
   return {
      attackingEntityIDs: escapeAIComponent.attackingEntityIDs,
      attackEntityTicksSinceLastAttack: escapeAIComponent.attackEntityTicksSinceLastAttack
   };
}