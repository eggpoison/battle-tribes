import { Settings } from "webgl-test-shared/dist/settings";
import Entity from "./Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Hitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { CollisionPushInfo, getCollisionPushInfo } from "webgl-test-shared/dist/hitbox-collision";

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
   // @Incomplete
   
   // for (let i = 0; i < entity.hitboxes.length; i++) {
   //    const hitbox = entity.hitboxes[i];
      
   //    const minTileX = clampToBoardDimensions(Math.floor((entity.position.x - 32) / Settings.TILE_SIZE));
   //    const maxTileX = clampToBoardDimensions(Math.floor((entity.position.x + 32) / Settings.TILE_SIZE));
   //    const minTileY = clampToBoardDimensions(Math.floor((entity.position.y - 32) / Settings.TILE_SIZE));
   //    const maxTileY = clampToBoardDimensions(Math.floor((entity.position.y + 32) / Settings.TILE_SIZE));
   
   //    // @Incomplete
   //    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
   //       for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
   //          const tile = Board.getTile(tileX, tileY);
   //          if (!tile.isWall) {
   //             continue;
   //          }

   //          // Check if the tile is colliding
   //          const tileCenterX = (tileX + 0.5) * Settings.TILE_SIZE;
   //          const tileCenterY = (tileY + 0.5) * Settings.TILE_SIZE;
   //          const tilePos = new Point(tileCenterX, tileCenterY);

   //          if (hitboxIsCircular(hitbox)) {
   //             // Circular
   //             if (!circleAndRectangleDoIntersect(hitbox.position, hitbox.radius, tilePos, Settings.TILE_SIZE, Settings.TILE_SIZE, 0)) {
   //                continue;
   //             }
   //          } else {
   //             // Rectangular

   //             // If the distance between the hitboxes is greater than the sum of their half diagonals then they're not colliding
   //             const dist = distance(tileCenterX, tileCenterY, hitbox.position.x, hitbox.position.y);
   //             const halfDiagonalLength = Math.sqrt(Settings.TILE_SIZE * Settings.TILE_SIZE / 4 + Settings.TILE_SIZE * Settings.TILE_SIZE / 4);
   //             if (dist > halfDiagonalLength + (hitbox as RectangularHitbox).halfDiagonalLength) {
   //                continue;
   //             }
               
   //             // @Speed
   //             const tileVertexPositions: HitboxVertexPositions = [
   //                new Point(tileCenterX - Settings.TILE_SIZE/2, tileCenterY + Settings.TILE_SIZE/2),
   //                new Point(tileCenterX + Settings.TILE_SIZE/2, tileCenterY + Settings.TILE_SIZE/2),
   //                new Point(tileCenterX - Settings.TILE_SIZE/2, tileCenterY - Settings.TILE_SIZE/2),
   //                new Point(tileCenterX + Settings.TILE_SIZE/2, tileCenterY - Settings.TILE_SIZE/2)
   //             ];
   //             const collisionData = rectanglesAreColliding(tileVertexPositions, hitbox.vertexPositions, new Point(0, 0), new Point(0, 0), 0, 1, hitbox.sideAxes[0].x, hitbox.sideAxes[0].y);
   //             if (!collisionData.isColliding) {
   //                continue;
   //             }
   //          }

   //          // Resolve collision
   //          let pushInfo: CollisionPushInfo | undefined; // @Temporary (undefined)
   //          if (hitbox.hasOwnProperty("radius")) {
   //             pushInfo = getCircleRectCollisionPushInfo(hitbox as CircularHitbox, tileCenterX, tileCenterY, Settings.TILE_SIZE, Settings.TILE_SIZE, 0);
   //          }

   //          // @Temporary
   //          if (typeof pushInfo !== "undefined") {
   //             resolveHardCollision(entity, pushInfo);
   //          }
   //       }
   //    }
   // }
}