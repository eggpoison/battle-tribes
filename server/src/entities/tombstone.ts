import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randInt } from "battletribes-shared/utils";
import { createItemsOverEntity } from "../entity-shared";
import { createZombieConfig } from "./mobs/zombie";
import { ItemType } from "battletribes-shared/items/items";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { createEntityFromConfig } from "../Entity";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getEntityLayer } from "../world";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { TombstoneComponent, TombstoneComponentArray } from "../components/TombstoneComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tombstone;
   
const WIDTH = 48;
const HEIGHT = 88;

export function createTombstoneConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), WIDTH, HEIGHT, 0), 1.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const healthComponent = new HealthComponent(50);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const tombstoneComponent = new TombstoneComponent();
   
   return {
      entityType: EntityType.tombstone,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tombstone]: tombstoneComponent
      }
   };
}

export function onTombstoneDeath(tombstone: EntityID, attackingEntity: EntityID | null): void {
   if (attackingEntity !== null && Math.random() < 0.6) {
      createItemsOverEntity(tombstone, ItemType.rock, randInt(2, 3), 40);

      // @Copynpaste
      const tombstoneComponent = TombstoneComponentArray.getComponent(tombstone);
      const isGolden = tombstoneComponent.tombstoneType === 0 && Math.random() < 0.005;
      
      const tombstoneTransformComponent = TransformComponentArray.getComponent(tombstone);

      const config = createZombieConfig(isGolden, tombstone);
      config.components[ServerComponentType.transform].position.x = tombstoneTransformComponent.position.x;
      config.components[ServerComponentType.transform].position.y = tombstoneTransformComponent.position.y;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntityFromConfig(config, getEntityLayer(tombstone), 0);
   }
}