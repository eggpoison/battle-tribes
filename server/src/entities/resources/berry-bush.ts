import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { createEntityFromConfig } from "../../Entity";
import Board from "../../Board";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createItemEntityConfig } from "../item-entity";
import { ComponentConfig } from "../../components";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "webgl-test-shared/dist/boxes/boxes";

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
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, BERRY_BUSH_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
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
   } while (!Board.isInBoard(position));

   const velocityDirectionOffset = (Math.random() - 0.5) * Math.PI * 0.15;

   const config = createItemEntityConfig();
   config[ServerComponentType.transform].position.x = position.x;
   config[ServerComponentType.transform].position.y = position.y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config[ServerComponentType.physics].velocityX = 40 * Math.sin(spawnDirection + velocityDirectionOffset);
   config[ServerComponentType.physics].velocityY = 40 * Math.cos(spawnDirection + velocityDirectionOffset);
   config[ServerComponentType.item].itemType = ItemType.berry;
   config[ServerComponentType.item].amount = 1;
   createEntityFromConfig(config);
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
}

export function onBerryBushHurt(berryBush: EntityID): void {
   dropBerry(berryBush, 1);
}