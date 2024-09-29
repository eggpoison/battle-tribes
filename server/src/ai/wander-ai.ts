import { Settings } from "battletribes-shared/settings";
import { randInt, TileIndex } from "battletribes-shared/utils";
import { getTileIndexIncludingEdges } from "../Layer";
import { moveEntityToPosition } from "../ai-shared";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { WanderAIComponentArray } from "../components/WanderAIComponent";
import { EntityID } from "battletribes-shared/entities";
import { TransformComponentArray } from "../components/TransformComponent";

export function shouldWander(physicsComponent: PhysicsComponent, wanderRate: number) {
   return physicsComponent.selfVelocity.x === 0 && physicsComponent.selfVelocity.y === 0 && Math.random() < wanderRate / Settings.TPS;
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

   return getTileIndexIncludingEdges(tileX, tileY);
}

export function wander(entity: EntityID, x: number, y: number, acceleration: number, turnSpeed: number): void {
   const wanderAIComponent = WanderAIComponentArray.getComponent(entity);
   wanderAIComponent.targetPositionX = x;
   wanderAIComponent.targetPositionY = y;
   moveEntityToPosition(entity, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY, acceleration, turnSpeed);
}