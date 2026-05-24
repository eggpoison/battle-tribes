import { ServerComponentType, Entity, Settings, getSubtileIndex, getAbsAngleDiff, randAngle, randFloat, randInt } from "battletribes-shared";
import { createTreeRootBaseConfig } from "../entities/resources/tree-root-base.js";
import { createTreeRootSegmentConfig } from "../entities/resources/tree-root-segment.js";
import Layer from "../Layer.js";
import { createEntity, destroyEntity, getEntityLayer } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class TreeRootBaseComponent {
   readonly segments: Array<Entity> = [];
}

export const TreeRootBaseComponentArray = new ComponentArray<TreeRootBaseComponent>(ServerComponentType.treeRootBase, true, getDataLength, addDataToPacket);
TreeRootBaseComponentArray.onJoin = onJoin;
TreeRootBaseComponentArray.preRemove = preRemove;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const segmentWillBeInWall = (rootLayer: Layer, rootX: number, rootY: number, offsetDirection: number): boolean => {
   const MAX_OFFSET_MAGNITUDE = 64;
   const NUM_CHECKS = 4;
   
   for (let i = 1; i <= NUM_CHECKS; i++) {
      const offsetMagnitude = MAX_OFFSET_MAGNITUDE * i / NUM_CHECKS;

      const rowX = rootX + offsetMagnitude * Math.sin(offsetDirection);
      const rowY = rootY + offsetMagnitude * Math.cos(offsetDirection);

      for (let xo = -1; xo <= 1; xo++) {
         const sidewaysOffsetMagnitude = 8 * xo;

         const x = rowX + sidewaysOffsetMagnitude * Math.sin(offsetDirection + Math.PI * 0.5);
         const y = rowY + sidewaysOffsetMagnitude * Math.cos(offsetDirection + Math.PI * 0.5);
         const subtileX = Math.floor(x / Settings.SUBTILE_SIZE);
         const subtileY = Math.floor(y / Settings.SUBTILE_SIZE);
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (rootLayer.subtileCanHaveWall(subtileIndex)) {
            return true;
         }
      }
   }

   return false;
}

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const treeRootHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(entity);

   const spawnOffsetDirections: Array<number> = [];

   const maxSegments = Math.random() < 2/3 ? 2 : 3;
   for (let i = 0, attempts = 0; i < maxSegments && attempts < 50; attempts++) {
      const offsetDirection = randAngle();

      // Make sure the segment won't spawn too close to another segment
      let isValid = true;
      for (const currentOffsetDirection of spawnOffsetDirections) {
         if (getAbsAngleDiff(offsetDirection, currentOffsetDirection) < Math.PI * 0.25) {
            isValid = false;
            break;
         }
      }
      if (!isValid) {
         continue;
      }

      if (segmentWillBeInWall(layer, treeRootHitbox.box.posX, treeRootHitbox.box.posY, offsetDirection)) {
         continue;
      }
      
      const offsetMagnitude = 38;
      const offsetX = offsetMagnitude * Math.sin(offsetDirection);
      const offsetY = offsetMagnitude * Math.cos(offsetDirection);

      const x = treeRootHitbox.box.posX + offsetX;
      const y = treeRootHitbox.box.posY + offsetY;

      const config = createTreeRootSegmentConfig(x, y, offsetDirection + randFloat(-0.1, 0.1), entity);
      createEntity(config, layer, 0);

      spawnOffsetDirections.push(offsetDirection);
      
      i++;
   }
}

function preRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const treeRootHitbox = transformComponent.hitboxes[0];

   // Respawn the tree root after a while
   const config = createTreeRootBaseConfig(treeRootHitbox.box.posX, treeRootHitbox.box.posY, randAngle());
   createEntity(config, getEntityLayer(entity), randInt(60, 90) * Settings.TICK_RATE);

   const treeRootBaseComponent = TreeRootBaseComponentArray.getComponent(entity);
   for (const segment of treeRootBaseComponent.segments) {
      destroyEntity(segment);
   }
}