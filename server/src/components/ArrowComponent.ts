import { ArrowStatusEffectInfo, ArrowComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, GenericArrowType } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";

export class ArrowComponent {
   public readonly type: GenericArrowType;
   public readonly throwerID: number;
   public readonly damage: number;
   public readonly knockback: number;
   public readonly ignoreFriendlyBuildings: boolean;
   // @Speed: Polymorphism
   public readonly statusEffect: ArrowStatusEffectInfo | null;

   constructor(throwerID: number, type: GenericArrowType, damage: number, knockback: number, ignoreFriendlyBuildings: boolean, statusEffect: ArrowStatusEffectInfo | null) {
      this.type = type;
      this.throwerID = throwerID;
      this.damage = damage;
      this.knockback = knockback;
      this.ignoreFriendlyBuildings = ignoreFriendlyBuildings;
      this.statusEffect = statusEffect;
   }
}

export const ArrowComponentArray = new ComponentArray<ServerComponentType.arrow, ArrowComponent>(true, {
   serialise: serialise
});

function serialise(entityID: EntityID): ArrowComponentData {
   const arrowComponent = ArrowComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.arrow,
      arrowType: arrowComponent.type
   };
}