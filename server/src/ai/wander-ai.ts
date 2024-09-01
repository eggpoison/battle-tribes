import { Settings } from "webgl-test-shared/dist/settings";
import { randInt, TileIndex } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import { moveEntityToPosition } from "../ai-shared";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { WanderAIComponentArray } from "../components/WanderAIComponent";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "../components/TransformComponent";

export function shouldWander(physicsComponent: PhysicsComponent, wanderRate: number) {
   return physicsComponent.velocity.x === 0 && physicsComponent.velocity.y === 0 && Math.random() < wanderRate / Settings.TPS;
}

export function getWanderTargetTile(entity: EntityID, visionRange: number): TileIndex {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const minTileX = Math.max(Math.floor((transformComponent.position.x - visionRange) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((transformComponent.position.x + visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
   const minTileY = Math.max(Math.floor((transformComponent.position.y - visionRange) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((transformComponent.position.y + visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);

   let attempts = 0;
   let tileX: number;
   let tileY: number;
   do {
      tileX = randInt(minTileX, maxTileX);
      tileY = randInt(minTileY, maxTileY);
   } while (++attempts <= 50 && Math.pow(transformComponent.position.x - (tileX + 0.5) * Settings.TILE_SIZE, 2) + Math.pow(transformComponent.position.y - (tileY + 0.5) * Settings.TILE_SIZE, 2) > visionRange * visionRange);

   return Board.getTileIndexIncludingEdges(tileX, tileY);
}

export function wander(entity: EntityID, x: number, y: number, acceleration: number, turnSpeed: number): void {
   const wanderAIComponent = WanderAIComponentArray.getComponent(entity);
   wanderAIComponent.targetPositionX = x;
   wanderAIComponent.targetPositionY = y;
   moveEntityToPosition(entity, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY, acceleration, turnSpeed);
}