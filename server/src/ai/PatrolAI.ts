import { TribesmanAIType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { distance, getTileX, getTileY, Point, TileIndex } from "../../../shared/src/utils";
import { getHumanoidRadius } from "../entities/tribes/tribesman-ai/tribesman-ai-utils";
import { Hitbox } from "../hitboxes";
import { getEntityFootprint, PathfindFailureDefault, runPathfindingSingleLayer, PathfindOptions } from "../pathfinding";
import { getEntityLayer, getGameTicks } from "../world";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../components/TribesmanAIComponent";
import { clearPathfinding, pathfindTribesman } from "../components/AIPathfindingComponent";

export class PatrolAI {
   public targetPatrolPosition: Readonly<Point> | null = null;

   /** The last tick timestamp for when the patrol AI was run. */
   public lastActiveTicks = 0;
}

const getTargetTileHeuristic = (transformComponent: TransformComponent, tileIndex: TileIndex): number => {
   const IDEAL_DIST = 1000;

   // @HACK
   const hitbox = transformComponent.hitboxes[0];

   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   const x = (tileX + 0.5) * Settings.TILE_SIZE;
   const y = (tileY + 0.5) * Settings.TILE_SIZE;

   const dist = distance(hitbox.box.position.x, hitbox.box.position.y, x, y);

   const u = dist / IDEAL_DIST;
   return u * Math.exp(-u);
}

/** Tries to generate a patrol target tile not to close and not too far */
const generateRandomPatrolTargetTile = (transformComponent: TransformComponent, patrolArea: ReadonlyArray<TileIndex>): TileIndex => {
   let bestHeuristic = -999999;
   let bestTile = 0;
   for (let i = 0; i < 15; i++) {
      const idx = Math.floor(Math.random() * patrolArea.length);
      const tileIndex = patrolArea[idx];

      const heuristic = getTargetTileHeuristic(transformComponent, tileIndex);
      if (heuristic > bestHeuristic) {
         bestHeuristic = heuristic;
         bestTile = tileIndex;
      }
   }

   return bestTile;
}

const generatePatrolTarget = (tribesman: Entity, patrolArea: ReadonlyArray<TileIndex>): Point | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);

   const layer = getEntityLayer(tribesman);
   const tribe = tribeComponent.tribe;
   
   // Randomly look for a place to patrol to
   for (let attempts = 0; attempts < 30; attempts++) {
      const tileIndex = generateRandomPatrolTargetTile(transformComponent, patrolArea);
      
      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;

      const options: PathfindOptions = {
         goalRadius: 0,
         failureDefault: 0,
         nodeBudget: 1000
      };
      const path = runPathfindingSingleLayer(layer, tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, x, y, tribe.pathfindingGroupID, getEntityFootprint(getHumanoidRadius(transformComponent)), options);
      if (!path.isFailed) {
         return new Point(x, y);
      }
   }

   return null;
}

export function runPatrolAI(tribeMember: Entity, patrolAI: PatrolAI, patrolArea: ReadonlyArray<TileIndex>): void {
   const currentTicks = getGameTicks();
   if (currentTicks > patrolAI.lastActiveTicks + 1) {
      // If more than 1 tick has passed between successive runs of the patrol AI, reset the target patrol position
      patrolAI.targetPatrolPosition = null;
   }
   patrolAI.lastActiveTicks = currentTicks;
   
   if (patrolAI.targetPatrolPosition === null && Math.random() < 0.4 * Settings.DT_S) {
      patrolAI.targetPatrolPosition = generatePatrolTarget(tribeMember, patrolArea);
   }
   
   if (patrolAI.targetPatrolPosition !== null) {
      const isFinished = pathfindTribesman(tribeMember, patrolAI.targetPatrolPosition.x, patrolAI.targetPatrolPosition.y, getEntityLayer(tribeMember), 0, TribesmanPathType.default, 0, PathfindFailureDefault.none);
      if (!isFinished) {
         // @Hack
         if (TribesmanAIComponentArray.hasComponent(tribeMember)) {
            const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribeMember);
            tribesmanAIComponent.currentAIType = TribesmanAIType.patrolling;
         }
         return;
      }
   }

   // Reset target patrol position when not patrolling

   // @Hack
   if (TribesmanAIComponentArray.hasComponent(tribeMember)) {
      const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribeMember);
      tribesmanAIComponent.currentAIType = TribesmanAIType.idle;
   }

   patrolAI.targetPatrolPosition = null;
   clearPathfinding(tribeMember);
}