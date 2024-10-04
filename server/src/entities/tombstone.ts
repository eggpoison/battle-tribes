import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randInt } from "battletribes-shared/utils";
import { createItemsOverEntity } from "../entity-shared";
import { createZombieConfig } from "./mobs/zombie";
import TombstoneDeathManager from "../tombstone-deaths";
import { ItemType } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../components";
import { createEntityFromConfig } from "../Entity";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getEntityLayer } from "../world";

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
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), WIDTH, HEIGHT, 0), 1.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
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
      createEntityFromConfig(config, getEntityLayer(tombstone), 0);
   }
}