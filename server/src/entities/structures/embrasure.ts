import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { BuildingMaterial, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createEmbrasureHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { ComponentConfig } from "../../components";
import Board from "../../Board";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.buildingMaterial;

export function createEmbrasureConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.embrasure,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createEmbrasureHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.poisoned
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.buildingMaterial]: {
         material: BuildingMaterial.wood
      }
   }
}

export function onEmbrasureCollision(collidingEntity: EntityID, pushedHitboxIdx: number): void {
   if (Board.getEntityType(collidingEntity) === EntityType.woodenArrow) {
      // @Incomplete?
      // const arrowComponent = ProjectileComponentArray.getComponent(collidingEntity.id);
      // if (arrowComponent.ignoreFriendlyBuildings) {
      //    return;
      // }

      if (pushedHitboxIdx <= 1) {
         Board.destroyEntity(collidingEntity);
      }
   }
}