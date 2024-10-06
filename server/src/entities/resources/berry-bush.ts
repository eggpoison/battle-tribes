import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { createEntityFromConfig } from "../../Entity";
import Layer from "../../Layer";
import { BerryBushComponent, BerryBushComponentArray } from "../../components/BerryBushComponent";
import { ItemType } from "battletribes-shared/items/items";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createItemEntityConfig } from "../item-entity";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { registerDirtyEntity } from "../../server/player-clients";
import { getEntityLayer } from "../../world";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { CollisionGroup } from "../../../../shared/src/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.berryBush;

export const BERRY_BUSH_RADIUS = 40;

export function createBerryBushConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, BERRY_BUSH_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;
   
   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const berryBushComponent = new BerryBushComponent();
   
   return {
      entityType: EntityType.berryBush,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.berryBush]: berryBushComponent
      }
   }
}

export function dropBerryOverEntity(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Generate new spawn positions until we find one inside the board
   let position: Point;
   let spawnDirection: number;
   do {
      // @Speed: Garbage collection
      position = transformComponent.position.copy();

      spawnDirection = 2 * Math.PI * Math.random();
      const spawnOffset = Point.fromVectorForm(40, spawnDirection);

      position.add(spawnOffset);
   } while (!Layer.isInBoard(position));

   const velocityDirectionOffset = (Math.random() - 0.5) * Math.PI * 0.15;

   const config = createItemEntityConfig(ItemType.berry, 1, null);
   config.components[ServerComponentType.transform].position.x = position.x;
   config.components[ServerComponentType.transform].position.y = position.y;
   config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config.components[ServerComponentType.physics].externalVelocity.x = 40 * Math.sin(spawnDirection + velocityDirectionOffset);
   config.components[ServerComponentType.physics].externalVelocity.y = 40 * Math.cos(spawnDirection + velocityDirectionOffset);
   createEntityFromConfig(config, getEntityLayer(entity), 0);
}

export function dropBerry(berryBush: EntityID, multiplier: number): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
   if (berryBushComponent.numBerries === 0) {
      return;
   }

   for (let i = 0; i < multiplier; i++) {
      dropBerryOverEntity(berryBush);
   }

   berryBushComponent.numBerries--;
   registerDirtyEntity(berryBush);
}

export function onBerryBushHurt(berryBush: EntityID): void {
   dropBerry(berryBush, 1);
}