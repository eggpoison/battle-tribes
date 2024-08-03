import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { createBallistaHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../../components";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.turret
   | ServerComponentType.aiHelper
   | ServerComponentType.ammoBox
   | ServerComponentType.inventory;

const VISION_RANGE = 550;
const AIM_ARC_SIZE = Math.PI / 2;

export function createBallistaConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.ballista,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createBallistaHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 100
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned | StatusEffect.bleeding
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.turret]: {
         fireCooldownTicks: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: VISION_RANGE
      },
      [ServerComponentType.ammoBox]: {},
      [ServerComponentType.inventory]: {
         inventories: [
            {
               inventoryName: InventoryName.ammoBoxInventory,
               width: 3,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
               items: []
            }
         ]
      }
   };
}