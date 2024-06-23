import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { ArrowComponentArray } from "../../components/ArrowComponent";
import { createEmbrasureHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export const EMBRASURE_HEALTHS = [15, 45];

export function createEmbrasure(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo, material: BuildingMaterial): Entity {
   const embrasure = new Entity(position, rotation, EntityType.embrasure, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createEmbrasureHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      embrasure.addHitbox(hitboxes[i]);
   }
   
   HealthComponentArray.addComponent(embrasure.id, new HealthComponent(EMBRASURE_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(embrasure.id, new StatusEffectComponent(StatusEffect.bleeding));
   StructureComponentArray.addComponent(embrasure.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(embrasure.id, new TribeComponent(tribe));
   BuildingMaterialComponentArray.addComponent(embrasure.id, new BuildingMaterialComponent(material));

   return embrasure;
}

export function onEmbrasureCollision(collidingEntity: Entity, pushedHitboxIdx: number): void {
   if (collidingEntity.type === EntityType.woodenArrowProjectile) {
      const arrowComponent = ArrowComponentArray.getComponent(collidingEntity.id);
      if (arrowComponent.ignoreFriendlyBuildings) {
         return;
      }

      if (pushedHitboxIdx <= 1) {
         collidingEntity.destroy();
      }
   }
}