import { Biome } from "../../../shared/src/biomes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { angle, getTileIndexIncludingEdges, getTileX, getTileY, lerp, Point, polarVec2, randItem, TileIndex } from "../../../shared/src/utils";
import { entityHasPassedPosition } from "../ai-shared";
import { Hitbox, addHitboxVelocity } from "../hitboxes";
import { getEntityType, getEntityLayer } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class FleshSwordItemComponent {
   public internalWiggleTicks = 0;
   // @Speed: Garbage collection
   public tileTargetPosition: Point | null = null;
}

const FLESH_SWORD_WANDER_MOVE_SPEED = 35;
const FLESH_SWORD_ESCAPE_MOVE_SPEED = 50;

const FLESH_SWORD_WANDER_RATE = 0.3;

export const FleshSwordItemComponentArray = new ComponentArray<FleshSwordItemComponent>(ServerComponentType.fleshSwordItem, true, getDataLength, addDataToPacket);
FleshSwordItemComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

/** Returns the entity the flesh sword should run away from, or null if there are none */
const getRunTarget = (itemEntity: Entity, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(itemEntity);
   const hitbox = transformComponent.hitboxes[0];

   let closestRunTargetDistance = Number.MAX_SAFE_INTEGER;
   let runTarget: Entity | null = null;

   for (const entity of visibleEntities) {
      const entityType = getEntityType(entity);
      if (entityType === EntityType.player || entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior) {
         const entityTransformComponent = TransformComponentArray.getComponent(itemEntity);
         const entityHitbox = entityTransformComponent.hitboxes[0];

         const distance = hitbox.box.position.distanceTo(entityHitbox.box.position);
         if (distance < closestRunTargetDistance) {
            closestRunTargetDistance = distance;
            runTarget = entity;
         }
      }
   }

   return runTarget;
}

const getTileWanderTargets = (itemEntity: Entity): Array<TileIndex> => {
   const transformComponent = TransformComponentArray.getComponent(itemEntity);
   const hitbox = transformComponent.hitboxes[0];
   const layer = getEntityLayer(itemEntity);
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(itemEntity);

   const minTileX = Math.max(Math.min(Math.floor((hitbox.box.position.x - aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const maxTileX = Math.max(Math.min(Math.floor((hitbox.box.position.x + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const minTileY = Math.max(Math.min(Math.floor((hitbox.box.position.y - aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const maxTileY = Math.max(Math.min(Math.floor((hitbox.box.position.y + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);

   const wanderTargets = new Array<TileIndex>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         // @Incomplete
         // Don't try to wander to wall tiles
         // if (layer.tileIsWalls[tileIndex]) continue;
         
         const position = new Point((tileX + Math.random()) * Settings.TILE_SIZE, (tileY + Math.random()) * Settings.TILE_SIZE);
         const distance = hitbox.box.position.distanceTo(position);
         if (distance <= aiHelperComponent.visionRange) {
            wanderTargets.push(tileIndex);
         }
      }
   }

   return wanderTargets;
}

function onTick(fleshSword: Entity): void {
   // Position the flesh sword wants to move to
   let targetPositionX = -1;
   let targetPositionY = -1;
   let moveSpeed: number | undefined;
   let wiggleSpeed: number | undefined;

   const aiHelperComponent = AIHelperComponentArray.getComponent(fleshSword);
   const visibleEntities = aiHelperComponent.visibleEntities;

   const runTarget = getRunTarget(fleshSword, visibleEntities);

   const transformComponent = TransformComponentArray.getComponent(fleshSword);
   const hitbox = transformComponent.hitboxes[0];

   const fleshSwordComponent = FleshSwordItemComponentArray.getComponent(fleshSword);

   // Run away from the run target
   if (runTarget !== null) {
      const runTargetTransformComponent = TransformComponentArray.getComponent(runTarget);
      const targetHitbox = runTargetTransformComponent.hitboxes[0];
      
      const angleFromTarget = hitbox.box.position.angleTo(targetHitbox.box.position);
      targetPositionX = hitbox.box.position.x + 100 * Math.sin(angleFromTarget + Math.PI);
      targetPositionY = hitbox.box.position.y + 100 * Math.cos(angleFromTarget + Math.PI);
      
      const distance = hitbox.box.position.distanceTo(targetHitbox.box.position);
      let dist = distance / aiHelperComponent.visionRange;
      dist = Math.pow(1 - dist, 2);
      wiggleSpeed = lerp(1, 4, dist);
      moveSpeed = FLESH_SWORD_ESCAPE_MOVE_SPEED * lerp(1, 3.5, dist);

      fleshSwordComponent.tileTargetPosition = null;
   } else {
      if (fleshSwordComponent.tileTargetPosition !== null) {
         if (entityHasPassedPosition(fleshSword, fleshSwordComponent.tileTargetPosition)) {
            fleshSwordComponent.tileTargetPosition = null;
         } else {
            targetPositionX = fleshSwordComponent.tileTargetPosition.x;
            targetPositionY = fleshSwordComponent.tileTargetPosition.y;
            moveSpeed = FLESH_SWORD_WANDER_MOVE_SPEED;
            wiggleSpeed = 1;
         }
      } else {
         // Chance to try to wander to a nearby tile
         if (Math.random() < FLESH_SWORD_WANDER_RATE * Settings.DT_S) {
            const tileWanderTargets = getTileWanderTargets(fleshSword);
   
            // If any of the tiles are in a swamp, move to them
            // Otherwise move to any random tile

            const layer = getEntityLayer(fleshSword);
            
            let foundSwampTile = false;
            for (const tileIndex of tileWanderTargets) {
               if (layer.tileBiomes[tileIndex] === Biome.swamp) {
                  foundSwampTile = true;
                  break;
               }
            }

            let targetTile: TileIndex;
            if (foundSwampTile) {
               const tiles = new Array<TileIndex>();
               for (const tileIndex of tileWanderTargets) {
                  if (layer.tileBiomes[tileIndex] === Biome.swamp) {
                     tiles.push(tileIndex);
                  }
               }
               targetTile = randItem(tiles);
            } else {
               targetTile = randItem(tileWanderTargets);
            }
   
            const x = (getTileX(targetTile) + Math.random()) * Settings.TILE_SIZE;
            const y = (getTileY(targetTile) + Math.random()) * Settings.TILE_SIZE;
            fleshSwordComponent.tileTargetPosition = new Point(x, y);
            moveSpeed = FLESH_SWORD_WANDER_MOVE_SPEED;
            wiggleSpeed = 1;
         }
      }
   }

   if (targetPositionX !== -1) {
      fleshSwordComponent.internalWiggleTicks += wiggleSpeed!;
      
      const directMoveAngle = angle(targetPositionX - hitbox.box.position.x, targetPositionY - hitbox.box.position.y);

      const moveAngleOffset = Math.sin(fleshSwordComponent.internalWiggleTicks * Settings.DT_S * 10) * Math.PI * 0.2;

      // @Hack: should instead change angularvelocity
      const moveAngle = directMoveAngle + moveAngleOffset;
      hitbox.box.relativeAngle = moveAngle - Math.PI/4;
      addHitboxVelocity(hitbox, polarVec2(moveSpeed!, moveAngle));

      transformComponent.isDirty = true;
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}