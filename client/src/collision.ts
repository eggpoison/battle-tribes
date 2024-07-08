import { Settings } from "webgl-test-shared/dist/settings";
import Entity from "./Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Hitbox, HitboxCollisionType, RectangularHitbox, updateHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { CollisionPushInfo, getCollisionPushInfo } from "webgl-test-shared/dist/hitbox-collision";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { clampToBoardDimensions, Point } from "webgl-test-shared/dist/utils";
import Board from "./Board";

const resolveHardCollision = (entity: Entity, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   entity.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   entity.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   const physicsComponent = entity.getServerComponent(ServerComponentType.physics);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const projectionCoeff = physicsComponent.velocity.x * bx + physicsComponent.velocity.y * by;
   physicsComponent.velocity.x = bx * projectionCoeff;
   physicsComponent.velocity.y = by * projectionCoeff;
}

const resolveSoftCollision = (entity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   // @Incomplete: divide by total mass not just pushed hitbox mass
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / pushedHitbox.mass;

   const physicsComponent = entity.getServerComponent(ServerComponentType.physics);
   
   physicsComponent.velocity.x += pushForce * Math.sin(pushInfo.direction);
   physicsComponent.velocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(entity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
   const pushInfo = getCollisionPushInfo(pushedHitbox, pushingHitbox);
   if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
      resolveHardCollision(entity, pushInfo);
   } else {
      resolveSoftCollision(entity, pushedHitbox, pushingHitbox, pushInfo);
   }
}

export function resolveWallTileCollisions(entity: Entity): void {
   for (let i = 0; i < entity.hitboxes.length; i++) {
      const hitbox = entity.hitboxes[i];
      
      // @Hack: use actual bounding area
      const minTileX = clampToBoardDimensions(Math.floor((entity.position.x - 32) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((entity.position.x + 32) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((entity.position.y - 32) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((entity.position.y + 32) / Settings.TILE_SIZE));
   
      // @Incomplete
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tile = Board.getTile(tileX, tileY);
            if (!tile.isWall) {
               continue;
            }

            // Check if the tile is colliding
            const tileCenterX = (tileX + 0.5) * Settings.TILE_SIZE;
            const tileCenterY = (tileY + 0.5) * Settings.TILE_SIZE;

            const tileHitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, Settings.TILE_SIZE, Settings.TILE_SIZE, 0);
            updateHitbox(tileHitbox, tileCenterX, tileCenterY, 0);

            if (hitbox.isColliding(tileHitbox)) {
               const pushInfo = getCollisionPushInfo(hitbox, tileHitbox);
               resolveHardCollision(entity, pushInfo);
            }
         }
      }
   }
}