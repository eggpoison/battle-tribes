import { Settings } from "webgl-test-shared/dist/settings";
import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import Tile from "../Tile";
import Board from "../Board";
import { WanderAIComponentArray } from "../components/ComponentArray";
import { moveEntityToPosition } from "../ai-shared";
import { PhysicsComponent } from "../components/PhysicsComponent";

export function shouldWander(physicsComponent: PhysicsComponent, wanderRate: number) {
   return physicsComponent.velocity.x === 0 && physicsComponent.velocity.y === 0 && Math.random() < wanderRate / Settings.TPS;
}

export function getWanderTargetTile(entity: Entity, visionRange: number): Tile {
   const minTileX = Math.max(Math.floor((entity.position.x - visionRange) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((entity.position.x + visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
   const minTileY = Math.max(Math.floor((entity.position.y - visionRange) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((entity.position.y + visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);

   let attempts = 0;
   let tileX: number;
   let tileY: number;
   do {
      tileX = randInt(minTileX, maxTileX);
      tileY = randInt(minTileY, maxTileY);
   } while (++attempts <= 50 && Math.pow(entity.position.x - (tileX + 0.5) * Settings.TILE_SIZE, 2) + Math.pow(entity.position.y - (tileY + 0.5) * Settings.TILE_SIZE, 2) > visionRange * visionRange);

   // @Temporary
   if (typeof Board.getTile(tileX, tileY) === "undefined") {
      console.log(entity.position, visionRange);
      throw new Error();
   }

   return Board.getTile(tileX, tileY);
}

export function wander(entity: Entity, x: number, y: number, acceleration: number, turnSpeed: number): void {
   const wanderAIComponent = WanderAIComponentArray.getComponent(entity.id);
   wanderAIComponent.targetPositionX = x;
   wanderAIComponent.targetPositionY = y;
   moveEntityToPosition(entity, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY, acceleration, turnSpeed);
}