import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { createEntityFromConfig } from "../../Entity";
import Layer from "../../Layer";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { ItemType } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createItemEntityConfig } from "../item-entity";
import { ComponentConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { registerDirtyEntity } from "../../server/player-clients";
import { getEntityLayer } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.berryBush;

export const BERRY_BUSH_RADIUS = 40;

export function createBerryBushConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.berryBush,
         collisionBit: COLLISION_BITS.plants,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, BERRY_BUSH_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.health]: {
         maxHealth: 10
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding
      },
      [ServerComponentType.berryBush]: {}
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

   const config = createItemEntityConfig();
   config[ServerComponentType.transform].position.x = position.x;
   config[ServerComponentType.transform].position.y = position.y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config[ServerComponentType.physics].velocityX = 40 * Math.sin(spawnDirection + velocityDirectionOffset);
   config[ServerComponentType.physics].velocityY = 40 * Math.cos(spawnDirection + velocityDirectionOffset);
   config[ServerComponentType.item].itemType = ItemType.berry;
   config[ServerComponentType.item].amount = 1;
   createEntityFromConfig(config, getEntityLayer(entity));
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