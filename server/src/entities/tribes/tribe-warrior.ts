import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ScarInfo, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { TribeType } from "battletribes-shared/tribes";
import { randInt, Point } from "battletribes-shared/utils";
import { TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import Layer from "../../Layer";
import { TribeComponentArray } from "../../components/TribeComponent";
import { ComponentConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { entityExists } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   | ServerComponentType.tribesmanAI
   | ServerComponentType.aiHelper
   | ServerComponentType.inventoryUse
   | ServerComponentType.inventory
   | ServerComponentType.tribeWarrior;

export const TRIBE_WARRIOR_RADIUS = 32;
export const TRIBE_WARRIOR_VISION_RANGE = 560;

const generateScars = (): ReadonlyArray<ScarInfo> => {
   let numScars = 1;
   while (Math.random() < 0.65 / numScars) {
      numScars++;
   }

   const scars = new Array<ScarInfo>();
   for (let i = 0; i < numScars; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = 20 * Math.random();
      scars.push({
         offsetX: offsetMagnitude * Math.sin(offsetDirection),
         offsetY: offsetMagnitude * Math.cos(offsetDirection),
         rotation: Math.PI / 2 * randInt(0, 3),
         type: randInt(0, 1)
      });
   }
   return scars;
}

export function createTribeWarriorConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.tribeWarrior,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, TRIBE_WARRIOR_RADIUS), 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByAirFriction: true,
         isAffectedByGroundFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.tribeMember]: {
         tribeType: TribeType.plainspeople,
         entityType: EntityType.tribeWarrior
      },
      [ServerComponentType.tribesmanAI]: {
         hut: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: TRIBE_WARRIOR_VISION_RANGE,
         ais: {}
      },
      [ServerComponentType.inventory]: {
         inventories: []
      },
      [ServerComponentType.inventoryUse]: {
         usedInventoryNames: []
      },
      [ServerComponentType.tribeWarrior]: {
         scars: generateScars()
      }
   };
}

export function onTribeWarriorDeath(warrior: EntityID): void {
   // Attempt to respawn the tribesman when it is killed
   // Only respawn the tribesman if their hut is alive
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(warrior);

   if (entityExists(tribesmanComponent.hutID)) {
      const tribeComponent = TribeComponentArray.getComponent(warrior);
      tribeComponent.tribe.respawnTribesman(tribesmanComponent.hutID);
   }
}