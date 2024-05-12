import { ArrowStatusEffectInfo, ArrowComponentData } from "webgl-test-shared/dist/components";
import { GenericArrowType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { ArrowComponentArray } from "./ComponentArray";

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

export function serialiseArrowComponent(entity: Entity): ArrowComponentData {
   const arrowComponent = ArrowComponentArray.getComponent(entity.id);
   return {
      arrowType: arrowComponent.type
   };
}