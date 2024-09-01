import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { createItemsOverEntity } from "../entity-shared";
import { createZombieConfig } from "./mobs/zombie";
import TombstoneDeathManager from "../tombstone-deaths";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../components";
import { createEntityFromConfig } from "../Entity";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tombstone;
   
const WIDTH = 48;
const HEIGHT = 88;

export function createTombstoneConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.tombstone,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new RectangularHitbox(1.25, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, WIDTH, HEIGHT, 0)]
      },
      [ServerComponentType.health]: {
         maxHealth: 50
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned
      },
      [ServerComponentType.tombstone]: {
         tombstoneType: randInt(0, 2),
         deathInfo: TombstoneDeathManager.popDeath()
      }
   };
}

export function onTombstoneDeath(tombstone: EntityID, attackingEntity: EntityID | null): void {
   if (attackingEntity !== null && Math.random() < 0.6) {
      createItemsOverEntity(tombstone, ItemType.rock, randInt(2, 3), 40);

      const tombstoneTransformComponent = TransformComponentArray.getComponent(tombstone);

      const config = createZombieConfig();
      config[ServerComponentType.transform].position.x = tombstoneTransformComponent.position.x;
      config[ServerComponentType.transform].position.y = tombstoneTransformComponent.position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.zombie].tombstone = tombstone;
      createEntityFromConfig(config);
   }
}