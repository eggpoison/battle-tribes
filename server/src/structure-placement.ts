import { getEntitiesInRange } from "./ai-shared.js";
import { getHitboxesCollidingEntities } from "./collision-detection.js";
import { EntityConfig, getConfigTransformComponent } from "./components.js";
import { ItemComponentArray } from "./components/ItemComponent.js";
import { TransformComponentArray } from "./components/TransformComponent.js";
import { createBallistaConfig } from "./entities/structures/ballista.js";
import { createBarrelConfig } from "./entities/structures/barrel.js";
import { createBracingsConfig } from "./entities/structures/bracings.js";
import { createCampfireConfig } from "./entities/structures/cooking-entities/campfire.js";
import { createFurnaceConfig } from "./entities/structures/cooking-entities/furnace.js";
import { createAutomatonAssemblerConfig } from "./entities/structures/crafting-stations/automaton-assembler.js";
import { createMithrilAnvilConfig } from "./entities/structures/crafting-stations/mithril-anvil.js";
import { createDoorConfig } from "./entities/structures/door.js";
import { createEmbrasureConfig } from "./entities/structures/embrasure.js";
import { createFenceConfig } from "./entities/structures/fence.js";
import { createFenceGateConfig } from "./entities/structures/fence-gate.js";
import { createFireTorchConfig } from "./entities/structures/fire-torch.js";
import { createFloorSignConfig } from "./entities/structures/floor-sign.js";
import { createFrostshaperConfig } from "./entities/structures/frostshaper.js";
import { createHealingTotemConfig } from "./entities/structures/healing-totem.js";
import { createPlanterBoxConfig } from "./entities/structures/planter-box.js";
import { createFloorPunjiSticksConfig } from "./entities/structures/punji-sticks-floor.js";
import { createWallPunjiSticksConfig } from "./entities/structures/punji-sticks-wall.js";
import { createResearchBenchConfig } from "./entities/structures/research-bench.js";
import { createSlingTurretConfig } from "./entities/structures/sling-turret.js";
import { createSlurbTorchConfig } from "./entities/structures/slurb-torch.js";
import { createFloorSpikesConfig } from "./entities/structures/spikes-floor.js";
import { createWallSpikesConfig } from "./entities/structures/spikes-wall.js";
import { createStonecarvingTableConfig } from "./entities/structures/stonecarving-table.js";
import { createTribeTotemConfig } from "./entities/structures/tribe-totem.js";
import { createTunnelConfig } from "./entities/structures/tunnel.js";
import { createWallConfig } from "./entities/structures/wall.js";
import { createWarriorHutConfig } from "./entities/structures/warrior-hut.js";
import { createWorkbenchConfig } from "./entities/structures/workbench.js";
import { createWorkerHutConfig } from "./entities/structures/worker-hut.js";
import { createCogwalkerConfig } from "./entities/tribes/automatons/cogwalker.js";
import { createScrappyConfig } from "./entities/tribes/automatons/scrappy.js";
import { Hitbox } from "./hitboxes.js";
import Layer from "./Layer.js";
import Tribe from "./Tribe.js";
import { getEntityType, getTribes } from "./world.js";
import { calculateBoxBounds, _bounds, createRectangularBox, getBoxCollisionResult, boxIsCircular } from "../../shared/dist/boxes.js";
import { getEntityCollisionGroup, CollisionGroup } from "../../shared/dist/collision-groups.js";
import { boxIsCollidingWithSubtile } from "../../shared/dist/collision.js";
import { BuildingMaterial } from "../../shared/dist/components.js";
import { Entity, EntityType } from "../../shared/dist/entities.js";
import { Settings } from "../../shared/dist/settings.js";
import { StructureType, STRUCTURE_TYPES } from "../../shared/dist/structures.js";
import { getSubtileIndex, subtileIsInWorldIncludingEdges, getSubtileX, getSubtileY, SubtileType } from "../../shared/dist/subtiles.js";
import { Point, angle, polarVec2, alignAngleToClosestAxis, getAbsAngleDiff, distance } from "../../shared/dist/utils.js";
import { getTileIndexIncludingEdges } from "../../shared/dist/tiles.js";

const enum Vars {
   STRUCTURE_PLACE_DISTANCE = 60,
   MULTI_SNAP_POSITION_TOLERANCE = 0.1,
   MULTI_SNAP_ANGLE_TOLERANCE = 0.02,
   COLLISION_EPSILON = 0.01
}

interface SnapCandidate {
   readonly position: Point;
   readonly angle: number;
   readonly connectedEntity: Entity;
   readonly hitboxes: readonly Hitbox[];
}

export interface StructureConnection {
   readonly entity: Entity;
   readonly relativeOffsetDirection: number;
}

export interface StructurePlaceInfo {
   readonly position: Point;
   readonly angle: number;
   readonly entityType: EntityType;
   readonly connections: StructureConnection[];
   readonly hitboxes: readonly Hitbox[];
   readonly isValid: boolean;
}

export function entityIsStructure(entityType: EntityType): entityType is StructureType {
   return STRUCTURE_TYPES.indexOf(entityType as StructureType) !== -1;
}

export function calculateRelativeOffsetDirection(entityX: number, entityY: number, entityAngle: number, connectingPosX: number, connectingPosY: number): number {
   // Relative angle of the offset (relative to the entity)
   let relativeOffsetDirection = angle(connectingPosX - entityX, connectingPosY - entityY);
   // Account for the entity rotaiton
   relativeOffsetDirection -= entityAngle;
   return relativeOffsetDirection;
}

export function createStructureConnection(connectingEntity: Entity, relativeOffsetDirection: number): StructureConnection {
   return {
      entity: connectingEntity,
      relativeOffsetDirection: relativeOffsetDirection
   };
}

export function createStructureConfig(tribe: Tribe, entityType: EntityType, x: number, y: number, angle: number, connections: StructureConnection[]): EntityConfig {
   let config: EntityConfig;
   switch (entityType) {
      case EntityType.wall: config = createWallConfig(x, y, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.door: config = createDoorConfig(x, y, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.embrasure: config = createEmbrasureConfig(x, y, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.floorSpikes: config = createFloorSpikesConfig(x, y, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.wallSpikes: config = createWallSpikesConfig(x, y, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.tunnel: config = createTunnelConfig(x, y, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.floorPunjiSticks: config = createFloorPunjiSticksConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.wallPunjiSticks: config = createWallPunjiSticksConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.ballista: config = createBallistaConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.slingTurret: config = createSlingTurretConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.tribeTotem: config = createTribeTotemConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.workerHut: config = createWorkerHutConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.warriorHut: config = createWarriorHutConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.barrel: config = createBarrelConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.workbench: config = createWorkbenchConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.researchBench: config = createResearchBenchConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.healingTotem: config = createHealingTotemConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.planterBox: config = createPlanterBoxConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.furnace: config = createFurnaceConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.campfire: config = createCampfireConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.fence: config = createFenceConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.fenceGate: config = createFenceGateConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.frostshaper: config = createFrostshaperConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.stonecarvingTable: config = createStonecarvingTableConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.bracings: config = createBracingsConfig(x, y, angle, tribe, BuildingMaterial.wood, null); break;
      case EntityType.fireTorch: config = createFireTorchConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.slurbTorch: config = createSlurbTorchConfig(x, y, angle, tribe, connections, null); break;
      // @Temporary
      case EntityType.scrappy: config = createScrappyConfig(x, y, angle, tribe); break;
      // case EntityType.scrappy: config = createBlueprintEntityConfig(tribe, BlueprintType.scrappy, 0, null); break;
      // @Temporary
      case EntityType.cogwalker: config = createCogwalkerConfig(x, y, angle, tribe); break;
      // case EntityType.cogwalker: config = createBlueprintEntityConfig(tribe, BlueprintType.cogwalker, 0, null); break;
      case EntityType.automatonAssembler: config = createAutomatonAssemblerConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.mithrilAnvil: config = createMithrilAnvilConfig(x, y, angle, tribe, connections, null); break;
      case EntityType.floorSign: config = createFloorSignConfig(x, y, angle, tribe, connections, null); break;
      // @Robustness?
      default: {
         throw new Error();
      }
   }
   return config;
}

const structureIntersectsWithBuildingBlockingTiles = (layer: Layer, hitboxes: readonly Hitbox[]): boolean => {
   for (const hitbox of hitboxes) {
      const box = hitbox.box;

      calculateBoxBounds(box);
      const minTileX = Math.floor(_bounds.minX / Settings.TILE_SIZE);
      const maxTileX = Math.floor(_bounds.maxX / Settings.TILE_SIZE);
      const minTileY = Math.floor(_bounds.minY / Settings.TILE_SIZE);
      const maxTileY = Math.floor(_bounds.maxY / Settings.TILE_SIZE);

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            if (!layer.tileIsBuildingBlocking(tileIndex)) {
               continue;
            }
            
            // @Speed
            const tileBox = createRectangularBox((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE, 0, 0, 0, Settings.TILE_SIZE, Settings.TILE_SIZE);

            if (getBoxCollisionResult(box, tileBox).isColliding) {
               return true;
            }
         }
      }
   }

   return false;
}

const structurePlaceIsValid = (hitboxes: readonly Hitbox[], layer: Layer): boolean => {
   // @Investigate: Why is this only called for structure placements which don't snap?
   
   if (structureIntersectsWithBuildingBlockingTiles(layer, hitboxes)) {
      return false;
   }

   // Make sure the structure wouldn't be in any walls
   for (const hitbox of hitboxes) {
      const box = hitbox.box;

      calculateBoxBounds(box);
      const minSubtileX = Math.floor(_bounds.minX / Settings.SUBTILE_SIZE);
      const maxSubtileX = Math.floor(_bounds.maxX / Settings.SUBTILE_SIZE);
      const minSubtileY = Math.floor(_bounds.minY / Settings.SUBTILE_SIZE);
      const maxSubtileY = Math.floor(_bounds.maxY / Settings.SUBTILE_SIZE);

      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            const subtileType = layer.getSubtileType(subtileIndex);
            if (subtileType !== SubtileType.none && boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
               return false;
            }
         }
      }
   }
   
   const collidingEntities = getHitboxesCollidingEntities(layer, hitboxes, Vars.COLLISION_EPSILON);

   for (let i = 0; i < collidingEntities.length; i++) {
      const entity = collidingEntities[i];

      const entityType = getEntityType(entity);

      // Disregard decorations
      // @Speed @Cleanup: ideally we would just exclude this collision type from the search in estimateCollidingEntities
      const collisionGroup = getEntityCollisionGroup(entityType);
      if (collisionGroup === CollisionGroup.decoration) {
         continue;
      }
      
      if (!ItemComponentArray.hasComponent(entity)) {
         return false;
      }
   }

   return true;
}

const calculateRegularPlacePosition = (placeOrigin: Point, placingEntityAngle: number, entityType: EntityType): Point => {
   // @Hack?
   if (entityType === EntityType.bracings) {
      const placePosition = polarVec2(Vars.STRUCTURE_PLACE_DISTANCE + Settings.TILE_SIZE * 0.5, placingEntityAngle);
      placePosition.add(placeOrigin);
      return placePosition;
   }
   
   // @HACK
   const tribe = getTribes()[0];
   const entityConfig = createStructureConfig(tribe, entityType, 0, 0, 0, []);
   const transformComponent = getConfigTransformComponent(entityConfig.components);

   let entityMinX = Number.MAX_SAFE_INTEGER;
   let entityMaxX = Number.MIN_SAFE_INTEGER;
   let entityMinY = Number.MAX_SAFE_INTEGER;
   let entityMaxY = Number.MIN_SAFE_INTEGER;
   
   for (const hitbox of transformComponent.hitboxes) {
      calculateBoxBounds(hitbox.box);
      const minX = _bounds.minX;
      const maxX = _bounds.maxX;
      const minY = _bounds.minY;
      const maxY = _bounds.maxY;
      
      if (minX < entityMinX) {
         entityMinX = minX;
      }
      if (maxX > entityMaxX) {
         entityMaxX = maxX;
      }
      if (minY < entityMinY) {
         entityMinY = minY;
      }
      if (maxY > entityMaxY) {
         entityMaxY = maxY;
      }
   }

   const boundingAreaHeight = entityMaxY - entityMinY;
   const placeOffsetY = boundingAreaHeight * 0.5;
   
   const placePosition = polarVec2(Vars.STRUCTURE_PLACE_DISTANCE + placeOffsetY, placingEntityAngle);
   placePosition.add(placeOrigin);
   return placePosition;
}

const getStructureSnapOrigin = (structure: Entity): Point => {
   // @Hack
   const transformComponent = TransformComponentArray.getComponent(structure);
   const hitbox = transformComponent.hitboxes[0];
   
   const snapOrigin = new Point(hitbox.box.posX, hitbox.box.posY);
   if (getEntityType(structure) === EntityType.embrasure) {
      snapOrigin.x -= 22 * Math.sin(hitbox.box.angle);
      snapOrigin.y -= 22 * Math.cos(hitbox.box.angle);
   }
   return snapOrigin;
}

const getSnapCandidatesOffConnectingEntity = (connectingEntity: Entity, desiredPlacePosition: Point, desiredPlaceAngle: number, entityType: EntityType, layer: Layer): readonly SnapCandidate[] => {
   const connectingEntityTransformComponent = TransformComponentArray.getComponent(connectingEntity);
   const connectingEntityType = getEntityType(connectingEntity);
   
   // @HACK @HACK @HACK @SQUEAM
   const tribe = getTribes()[0];
   const entityConfig = createStructureConfig(tribe, entityType, 0, 0, 0, []);
   const transformComponent = getConfigTransformComponent(entityConfig.components);
   
   const snapOrigin = getStructureSnapOrigin(connectingEntity);
   
   const snapPositions: SnapCandidate[] = [];

   for (const placingEntityHitbox of transformComponent.hitboxes) {
      const box = placingEntityHitbox.box;

      // @Cleanup: copy and paste
      let placingEntityHitboxHalfWidth: number;
      let placingEntityHitboxHalfHeight: number;
      if (boxIsCircular(box)) {
         placingEntityHitboxHalfWidth = box.radius;
         placingEntityHitboxHalfHeight = box.radius;
      } else {
         placingEntityHitboxHalfWidth = box.width * 0.5;
         placingEntityHitboxHalfHeight = box.height * 0.5;
      }

      // @Hack @Copynpaste
      // Fences are placed with space between them and the hitbox they're connecting to
      if (entityType === EntityType.fence) {
         placingEntityHitboxHalfWidth += 20;
         placingEntityHitboxHalfHeight += 20;
      }
      
      for (const connectingEntityHitbox of connectingEntityTransformComponent.hitboxes) {
         const box = connectingEntityHitbox.box;
      
         let hitboxHalfWidth: number;
         let hitboxHalfHeight: number;
         if (boxIsCircular(box)) {
            hitboxHalfWidth = box.radius;
            hitboxHalfHeight = box.radius;
         } else {
            hitboxHalfWidth = box.width * 0.5;
            hitboxHalfHeight = box.height * 0.5;
         }

         // @Hack @Copynpaste
         // Fences are placed with space between them and the hitbox they're connecting to
         if (connectingEntityType === EntityType.fence) {
            hitboxHalfWidth += 20;
            hitboxHalfHeight += 20;
         }

         // Add snap positions for each direction off the connecting entity hitbox
         for (let i = 0; i < 4; i++) {
            const offsetDirection = connectingEntityHitbox.box.angle + i * Math.PI / 2;
      
            const connectingEntityOffset = i % 2 === 0 ? hitboxHalfHeight : hitboxHalfWidth;
   
            const placingEntityAngle = alignAngleToClosestAxis(desiredPlaceAngle, connectingEntityHitbox.box.angle);
            
            let placingEntityOffset: number;
            // Direction to the snapping entity is opposite of the offset from the snapping entity
            const angleDiff = getAbsAngleDiff(offsetDirection + Math.PI, placingEntityAngle);
            if (angleDiff < Math.PI * 0.5) {
               // Top or bottom is bing connected
               placingEntityOffset = placingEntityHitboxHalfHeight;
            } else {
               // Left or right is being connected
               placingEntityOffset = placingEntityHitboxHalfWidth;
            }

            const maxLength = Math.max(placingEntityHitboxHalfWidth * 2, (i % 2 === 0 ? hitboxHalfWidth : hitboxHalfHeight) * 2);
            const minLength = Math.min(placingEntityHitboxHalfWidth * 2, (i % 2 === 0 ? hitboxHalfWidth : hitboxHalfHeight) * 2);
            const positions: Point[] = [];
            for (let xi = -1; xi <= 1; xi++) {
               const sideOffset = (maxLength - minLength) * 0.5 * xi;
               
               const position = polarVec2(connectingEntityOffset + placingEntityOffset, offsetDirection);
               position.add(snapOrigin);
               position.x += sideOffset * Math.sin(offsetDirection + Math.PI * 0.5);
               position.y += sideOffset * Math.cos(offsetDirection + Math.PI * 0.5);
               positions.push(position);
            }

            let position!: Point;
            let minDist = Number.MAX_SAFE_INTEGER;
            for (const currentPosition of positions) {
               const dist = currentPosition.distanceTo(desiredPlacePosition);
               if (dist < minDist) {
                  minDist = dist;
                  position = currentPosition;
               }
            }

            // @SUPAHACK
            const tribe = getTribes()[0];
            const entityConfig = createStructureConfig(tribe, entityType, position.x, position.y, placingEntityAngle, []);
            const transformComponent = getConfigTransformComponent(entityConfig.components);
            
            // Don't add the position if it would be colliding with the connecting entity
            let isValid = true;
            const collidingEntities = getHitboxesCollidingEntities(layer, transformComponent.hitboxes, Vars.COLLISION_EPSILON);
            for (let l = 0; l < collidingEntities.length; l++) {
               const collidingEntity = collidingEntities[l];
               if (collidingEntity === connectingEntity) {
                  isValid = false;
                  break;
               }
            }
      
            if (isValid) {
               snapPositions.push({
                  position: position,
                  angle: placingEntityAngle,
                  connectedEntity: connectingEntity,
                  hitboxes: transformComponent.hitboxes
               });
            }

            // // If the hitbox is circular, add the free position
            // if (hitboxIsCircular(hitbox)) {
            //    const offsetDirection = connectingEntity.position.angleTo(desiredPlacePosition);
            //    // @Copynpaste
   
               
            //    const placingEntityRotation = of
               
            //    let placingEntityOffset: number;
            //    let placingEntityRotation: number;
            //    // Direction to the snapping entity is opposite of the offset from the snapping entity
            //    const angleDiff = getAbsAngleDiff(offsetDirection + Math.PI, placeRotation);
            //    if (angleDiff < Math.PI * 0.5) {
            //       // Top or bottom is bing connected
            //       placingEntityOffset = placingEntityHitboxHalfHeight;
            //       placingEntityRotation = connectingEntity.rotation;
            //    } else {
            //       // Left or right is being connected
            //       placingEntityOffset = placingEntityHitboxHalfWidth;
            //       placingEntityRotation = connectingEntity.rotation + Math.PI * 0.5;
            //    }
               
            //    const position = Point.fromVectorForm(connectingEntityOffset + placingEntityOffset, offsetDirection);
            //    position.add(snapOrigin);

            //    // Don't add the position if it would be colliding with the connecting entity
            //    let isValid = true;
            //    const collidingEntities = estimateCollidingEntities(worldInfo, structureType, position.x, position.y, placingEntityRotation, Vars.COLLISION_EPSILON);
            //    for (let l = 0; l < collidingEntities.length; l++) {
            //       const collidingEntityID = collidingEntities[l];
            //       if (collidingEntityID === connectingEntity.id) {
            //          isValid = false;
            //          break;
            //       }
            //    }
      
            //    if (isValid) {
            //       snapPositions.push({
            //          position: position,
            //          rotation: placingEntityRotation,
            //          connectedEntityID: connectingEntity.id
            //       });
            //    }
            // }
         }
      }
   }

   return snapPositions;
}

const findCandidatePlacePositions = (entityType: EntityType, desiredPlacePosition: Point, desiredPlaceRotation: number, layer: Layer): SnapCandidate[] => {
   const candidatePositions: SnapCandidate[] = [];
   
   const entitiesInSnapRange = getEntitiesInRange(layer, desiredPlacePosition.x, desiredPlacePosition.y, Settings.STRUCTURE_SNAP_RANGE);
   for (const entity of entitiesInSnapRange) {
      const currentEntityType = getEntityType(entity);
      if (!entityIsStructure(currentEntityType)) {
         continue;
      }
      
      const positionsOffEntity = getSnapCandidatesOffConnectingEntity(entity, desiredPlacePosition, desiredPlaceRotation, entityType, layer);

      for (let i = 0; i < positionsOffEntity.length; i++) {
         const position = positionsOffEntity[i];
         
         candidatePositions.push(position);
      }
   }

   return candidatePositions;
}

const transformsFormGroup = (transform1: SnapCandidate, transform2: SnapCandidate): boolean => {
   const dist = distance(transform1.position.x, transform1.position.y, transform2.position.x, transform2.position.y);
   if (dist > Vars.MULTI_SNAP_POSITION_TOLERANCE) {
      return false;
   }

   if (Math.abs(transform1.angle - transform2.angle) > Vars.MULTI_SNAP_ANGLE_TOLERANCE) {
      return false;
   }

   return true;
}

const getExistingGroup = (transform: SnapCandidate, groups: readonly SnapCandidate[][]): SnapCandidate[] | null => {
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      // Just test with the first one in the group, it shouldn't matter
      const testTransform = group[0];
      if (transformsFormGroup(transform, testTransform)) {
         return group;
      }
   }

   return null;
}

const groupTransforms = (transforms: readonly SnapCandidate[], entityType: EntityType, layer: Layer): readonly StructurePlaceInfo[] => {
   const groups: SnapCandidate[][] = [];
   
   for (let i = 0; i < transforms.length; i++) {
      const transform = transforms[i];

      const existingGroup = getExistingGroup(transform, groups);
      if (existingGroup !== null) {
         existingGroup.push(transform);
      } else {
         const group = [transform];
         groups.push(group);
      }
   }

   const placeInfos: StructurePlaceInfo[] = [];
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const firstTransform = group[0];
      
      const connections: StructureConnection[] = [];
      for (const transform of group) {
         // @Hack
         const connectingEntityTransformComponent = TransformComponentArray.getComponent(transform.connectedEntity);
         const connectingEntityHitbox = connectingEntityTransformComponent.hitboxes[0];
         
         const relativeOffsetDirection = calculateRelativeOffsetDirection(transform.position.x, transform.position.y, transform.angle, connectingEntityHitbox.box.posX, connectingEntityHitbox.box.posY);
         const connection = createStructureConnection(transform.connectedEntity, relativeOffsetDirection);
         connections.push(connection);
      }

      const placeInfo: StructurePlaceInfo = {
         position: firstTransform.position,
         angle: firstTransform.angle,
         connections: connections,
         entityType: entityType,
         hitboxes: [],
         isValid: structurePlaceIsValid(firstTransform.hitboxes, layer)
      };
      placeInfos.push(placeInfo);
   }

   return placeInfos;
}

const filterCandidatePositions = (candidates: SnapCandidate[], regularPlacePosition: Readonly<Point>): void => {
   for (let i = 0; i < candidates.length; i++) {
      const transform = candidates[i];

      if (transform.position.distanceTo(regularPlacePosition) > Settings.STRUCTURE_POSITION_SNAP) {
         candidates.splice(i, 1);
         i--;
      }
   }
}

const getNearbyTileCornerSubtiles = (regularPlacePosition: Point): readonly number[] => {
   const minTileX = Math.floor(regularPlacePosition.x / Settings.TILE_SIZE);
   const maxTileX = Math.ceil(regularPlacePosition.x / Settings.TILE_SIZE);
   const minTileY = Math.floor(regularPlacePosition.y / Settings.TILE_SIZE);
   const maxTileY = Math.ceil(regularPlacePosition.y / Settings.TILE_SIZE);

   const tileCornerSubtiles: number[] = [];
   for (let tileCornerX = minTileX; tileCornerX <= maxTileX; tileCornerX++) {
      for (let tileCornerY = minTileY; tileCornerY <= maxTileY; tileCornerY++) {
         const subtileX = tileCornerX * Settings.SUBTILES_IN_TILE;
         const subtileY = tileCornerY * Settings.SUBTILES_IN_TILE;
         tileCornerSubtiles.push(getSubtileIndex(subtileX, subtileY));
      }
   }
   return tileCornerSubtiles;
}

const checkSubtileForWall = (subtileX: number, subtileY: number, layer: Layer): boolean => {
   // A subtile can support bracings if it both:
   // - Is in the world
   // - Is mined out
   
   if (!subtileIsInWorldIncludingEdges(subtileX, subtileY)) {
      return false;
   }

   const subtileIndex = getSubtileIndex(subtileX, subtileY);
   return layer.subtileIsMined(subtileIndex);
}

const cornerIsPlaceable = (cornerSubtileX: number, cornerSubtileY: number, layer: Layer): boolean => {
   // Corners are valid if they have 1-3 wall subtiles connected to the corner

   let numConnected = 0;

   if (checkSubtileForWall(cornerSubtileX, cornerSubtileY, layer)) {
      numConnected++;
   }
   if (checkSubtileForWall(cornerSubtileX - 1, cornerSubtileY, layer)) {
      numConnected++;
   }
   if (checkSubtileForWall(cornerSubtileX, cornerSubtileY - 1, layer)) {
      numConnected++;
   }
   if (checkSubtileForWall(cornerSubtileX - 1, cornerSubtileY - 1, layer)) {
      numConnected++;
   }

   return numConnected >= 1 && numConnected <= 4;
}

const getBracingsPlaceInfo = (regularPlacePosition: Point, layer: Layer): StructurePlaceInfo => {
   // Note: for each subtile, the corner position refers to the bottom-left corner of the subtile
   const nearbyTileCornerSubtiles = getNearbyTileCornerSubtiles(regularPlacePosition);

   let closestTileCorner: number | undefined;
   let secondClosestTileCorner: number | undefined;

   let minDist = Number.MAX_SAFE_INTEGER;
   let secondMinDist = Number.MAX_SAFE_INTEGER;

   for (let i = 0; i < nearbyTileCornerSubtiles.length; i++) {
      const subtileIndex = nearbyTileCornerSubtiles[i];
      const subtileX = getSubtileX(subtileIndex);
      const subtileY = getSubtileY(subtileIndex);
      
      const x = subtileX * Settings.SUBTILE_SIZE;
      const y = subtileY * Settings.SUBTILE_SIZE;
      const dist = distance(x, y, regularPlacePosition.x, regularPlacePosition.y);

      if (dist < minDist) {
         secondClosestTileCorner = closestTileCorner;
         secondMinDist = minDist;
         
         closestTileCorner = subtileIndex;
         minDist = dist;
      } else if (dist < secondMinDist) {
         secondClosestTileCorner = subtileIndex;
         secondMinDist = dist;
      }
   }

   if (closestTileCorner === undefined || secondClosestTileCorner === undefined) {
      throw new Error();
   }

   let isValid = true;
   
   const closestTileCornerSubtileX = getSubtileX(closestTileCorner);
   const closestTileCornerSubtileY = getSubtileY(closestTileCorner);
   if (!cornerIsPlaceable(closestTileCornerSubtileX, closestTileCornerSubtileY, layer)) {
      isValid = false;
   }
   
   const secondClosestTileCornerSubtileX = getSubtileX(secondClosestTileCorner);
   const secondClosestTileCornerSubtileY = getSubtileY(secondClosestTileCorner);
   if (!cornerIsPlaceable(secondClosestTileCornerSubtileX, secondClosestTileCornerSubtileY, layer)) {
      isValid = false;
   }

   const closestTileCornerX = Settings.SUBTILE_SIZE * closestTileCornerSubtileX;
   const closestTileCornerY = Settings.SUBTILE_SIZE * closestTileCornerSubtileY;

   const secondClosestTileCornerX = Settings.SUBTILE_SIZE * secondClosestTileCornerSubtileX;
   const secondClosestTileCornerY = Settings.SUBTILE_SIZE * secondClosestTileCornerSubtileY;

   // Place position is the average of the two corner's positions
   const x = (closestTileCornerX + secondClosestTileCornerX) * 0.5;
   const y = (closestTileCornerY + secondClosestTileCornerY) * 0.5;
   const position = new Point(x, y);

   // 0 angle - vertical, 90 deg angle - horizontal
   const angle = closestTileCornerSubtileY === secondClosestTileCornerSubtileY ? Math.PI / 2 : 0;
   
   // @SUPAHACK
   const tribe = getTribes()[0];
   const entityConfig = createStructureConfig(tribe, EntityType.bracings, x, y, angle, []);
   const transformComponent = getConfigTransformComponent(entityConfig.components);
   
   if (structureIntersectsWithBuildingBlockingTiles(layer, transformComponent.hitboxes)) {
      isValid = false;
   }
   
   return {
      position: position,
      angle: angle,
      connections: [],
      entityType: EntityType.bracings,
      hitboxes: transformComponent.hitboxes,
      isValid: isValid
   };
}

const calculatePlaceInfo = (desiredPlacePosition: Point, desiredPlaceAngle: number, entityType: EntityType, layer: Layer): StructurePlaceInfo => {
   // @Hack?
   if (entityType === EntityType.bracings) {
      return getBracingsPlaceInfo(desiredPlacePosition, layer);
   }
   
   const snapCandidates = findCandidatePlacePositions(entityType, desiredPlacePosition, desiredPlaceAngle, layer);
   filterCandidatePositions(snapCandidates, desiredPlacePosition);
   
   const placeInfos = groupTransforms(snapCandidates, entityType, layer);
   if (placeInfos.length === 0) {
      // @Speed @Copynpaste: already done for candidates
      // @HACK
      const tribe = getTribes()[0];
      const entityConfig = createStructureConfig(tribe, entityType, desiredPlacePosition.x, desiredPlacePosition.y, desiredPlaceAngle, []);
      const transformComponent = getConfigTransformComponent(entityConfig.components);
      const hitboxes = transformComponent.hitboxes;

      // If no connections are found, use the regular place position
      return {
         position: desiredPlacePosition,
         angle: desiredPlaceAngle,
         connections: [],
         entityType: entityType,
         hitboxes: [],
         isValid: structurePlaceIsValid(hitboxes, layer)
      };
   } else {
      // @Incomplete:
      // - First filter by num snaps
      // - Then filter by proximity to regular place position

      return placeInfos[0];
   }
}

export function calculateEntityPlaceInfo(placeOrigin: Point, desiredPlaceAngle: number, entityType: EntityType, layer: Layer): StructurePlaceInfo {
   const regularPlacePosition = calculateRegularPlacePosition(placeOrigin, desiredPlaceAngle, entityType);
   return calculatePlaceInfo(regularPlacePosition, desiredPlaceAngle, entityType, layer);
}