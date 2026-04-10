import { BuildingMaterial, ServerComponentType, Point, alignAngleToClosestAxis, getAbsAngleDiff, distance, getTileIndexIncludingEdges, polarVec2, SubtileType, getSubtileIndex, subtileIsInWorld, getSubtileX, getSubtileY, STRUCTURE_TYPES, StructureType, Settings, Entity, EntityType, getEntityCollisionGroup, CollisionGroup, boxIsCollidingWithSubtile, RectangularBox, boxIsCircular, _bounds } from "webgl-test-shared";
import { Hitbox } from "./hitboxes";
import { ItemComponentArray } from "./entity-components/server-components/ItemComponent";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { EntityComponentData, getEntityType } from "./world";
import { playerTribe } from "./tribes";
import { createWallConfig } from "./entities/wall";
import { createFloorSpikesConfig, createWallSpikesConfig } from "./entities/spikes";
import { createAutomatonAssemblerConfig } from "./entities/automaton-assembler";
import { createBallistaConfig } from "./entities/ballista";
import { createBarrelConfig } from "./entities/barrel";
import { createBracingsConfig } from "./entities/bracings";
import { createCampfireConfig } from "./entities/campfire";
import { createCogwalkerConfig } from "./entities/cogwalker";
import { createDoorConfig } from "./entities/door";
import { createEmbrasureConfig } from "./entities/embrasure";
import { createFenceConfig } from "./entities/fence";
import { createFenceGateConfig } from "./entities/fence-gate";
import { createFireTorchConfig } from "./entities/fire-torch";
import { createFurnaceConfig } from "./entities/furnace";
import { createHealingTotemConfig } from "./entities/healing-totem";
import { createMithrilAnvilConfig } from "./entities/mithril-anvil";
import { createPlanterBoxConfig } from "./entities/planter-box";
import { createFloorPunjiSticksConfig, createWallPunjiSticksConfig } from "./entities/punji-sticks";
import { createResearchBenchConfig } from "./entities/research-bench";
import { createScrappyConfig } from "./entities/scrappy";
import { createSlingTurretConfig } from "./entities/sling-turret";
import { createSlurbTorchConfig } from "./entities/slurb-torch";
import { createStonecarvingTableConfig } from "./entities/stonecarving-table";
import { createTribeTotemConfig } from "./entities/tribe-totem";
import { createTunnelConfig } from "./entities/tunnel";
import { createWarriorHutConfig } from "./entities/warrior-hut";
import { createWorkbenchConfig } from "./entities/workbench";
import { createWorkerHutConfig } from "./entities/worker-hut";
import { createFrostshaperConfig } from "./entities/frostshaper";
import { getEntitiesInRange, getHitboxesCollidingEntities } from "./collision";
import { createFloorSignConfig } from "./entities/floor-sign";
import { getTransformComponentData } from "./entity-component-types";

const enum Vars {
   STRUCTURE_PLACE_DISTANCE = 60,
   MULTI_SNAP_POSITION_TOLERANCE = 0.1,
   MULTI_SNAP_ROTATION_TOLERANCE = 0.02,
   COLLISION_EPSILON = 0.01
}

// @Incomplete
// interface SnapAxis {
//    readonly placingHitbox: Hitbox;
//    readonly connectingEntity: Entity;
//    readonly connectingHitbox: Hitbox;
//    readonly axisOrigin: Point;
//    readonly axis: Point;
// }

interface SnapCandidate {
   readonly position: Point;
   readonly angle: number;
   readonly connectedEntity: Entity;
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

export interface StructureConnection {
   readonly entity: Entity;
   readonly relativeOffsetDirection: number;
}

export interface StructurePlaceInfo {
   readonly position: Point;
   readonly rotation: number;
   readonly entityType: EntityType;
   readonly connections: Array<StructureConnection>;
   readonly hitboxes: ReadonlyArray<Hitbox>;
   readonly isValid: boolean;
}

export function entityIsStructure(entityType: EntityType): entityType is StructureType {
   return STRUCTURE_TYPES.indexOf(entityType as StructureType) !== -1;
}

const calculateRelativeOffsetDirection = (entityPosition: Point, entityRotation: number, connectingEntityPosition: Point): number => {
   // Relative rotation of the offset (relative to the entity)
   let relativeOffsetDirection = entityPosition.angleTo(connectingEntityPosition);
   // Account for the entity rotaiton
   relativeOffsetDirection -= entityRotation;
   return relativeOffsetDirection;
}

export function createStructureConnection(connectingEntity: Entity, relativeOffsetDirection: number): StructureConnection {
   return {
      entity: connectingEntity,
      relativeOffsetDirection: relativeOffsetDirection
   };
}

export function createStructureConfig(entityType: EntityType, position: Point, rotation: number): EntityComponentData {
   const tribe = playerTribe;
   let config: EntityComponentData;
   switch (entityType) {
      case EntityType.wall: config = createWallConfig(position, rotation, tribe, BuildingMaterial.wood); break;
      case EntityType.door: config = createDoorConfig(position, rotation, tribe, BuildingMaterial.wood); break;
      case EntityType.embrasure: config = createEmbrasureConfig(position, rotation, tribe, BuildingMaterial.wood); break;
      case EntityType.floorSpikes: config = createFloorSpikesConfig(position, rotation, tribe, BuildingMaterial.wood); break;
      case EntityType.wallSpikes: config = createWallSpikesConfig(position, rotation, tribe, BuildingMaterial.wood); break;
      case EntityType.tunnel: config = createTunnelConfig(position, rotation, tribe, BuildingMaterial.wood); break;
      case EntityType.floorPunjiSticks: config = createFloorPunjiSticksConfig(position, rotation, tribe); break;
      case EntityType.wallPunjiSticks: config = createWallPunjiSticksConfig(position, rotation, tribe); break;
      case EntityType.ballista: config = createBallistaConfig(position, rotation, tribe); break;
      case EntityType.slingTurret: config = createSlingTurretConfig(position, rotation, tribe); break;
      case EntityType.tribeTotem: config = createTribeTotemConfig(position, rotation, tribe); break;
      case EntityType.workerHut: config = createWorkerHutConfig(position, rotation, tribe); break;
      case EntityType.warriorHut: config = createWarriorHutConfig(position, rotation, tribe); break;
      case EntityType.barrel: config = createBarrelConfig(position, rotation, tribe); break;
      case EntityType.workbench: config = createWorkbenchConfig(position, rotation, tribe); break;
      case EntityType.researchBench: config = createResearchBenchConfig(position, rotation, tribe); break;
      case EntityType.healingTotem: config = createHealingTotemConfig(position, rotation, tribe); break;
      case EntityType.planterBox: config = createPlanterBoxConfig(position, rotation, tribe); break;
      case EntityType.furnace: config = createFurnaceConfig(position, rotation, tribe); break;
      case EntityType.campfire: config = createCampfireConfig(position, rotation, tribe); break;
      case EntityType.fence: config = createFenceConfig(position, rotation, tribe); break;
      case EntityType.fenceGate: config = createFenceGateConfig(position, rotation, tribe); break;
      case EntityType.frostshaper: config = createFrostshaperConfig(position, rotation, tribe); break;
      case EntityType.stonecarvingTable: config = createStonecarvingTableConfig(position, rotation, tribe); break;
      case EntityType.bracings: config = createBracingsConfig(position, rotation, tribe, BuildingMaterial.wood); break;
      case EntityType.fireTorch: config = createFireTorchConfig(position, rotation, tribe); break;
      case EntityType.slurbTorch: config = createSlurbTorchConfig(position, rotation, tribe); break;
      // @Temporary
      case EntityType.scrappy: config = createScrappyConfig(position, rotation, tribe); break;
      // case EntityType.scrappy: config = createBlueprintEntityConfig(tribe, BlueprintType.scrappy, 0, null); break;
      // @Temporary
      case EntityType.cogwalker: config = createCogwalkerConfig(position, rotation, tribe); break;
      // case EntityType.cogwalker: config = createBlueprintEntityConfig(tribe, BlueprintType.cogwalker, 0, null); break;
      case EntityType.automatonAssembler: config = createAutomatonAssemblerConfig(position, rotation, tribe); break;
      case EntityType.mithrilAnvil: config = createMithrilAnvilConfig(position, rotation, tribe); break;
      case EntityType.floorSign: config = createFloorSignConfig(position, rotation, tribe); break;
      // @Robustness?
      default: {
         throw new Error();
      }
   }
   return config;
}

const structureIntersectsWithBuildingBlockingTiles = (layer: Layer, hitboxes: ReadonlyArray<Hitbox>): boolean => {
   for (const hitbox of hitboxes) {
      const box = hitbox.box;

      box.calculateBounds();
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
            const position = new Point((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE);
            const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.TILE_SIZE, Settings.TILE_SIZE);

            if (box.getCollisionResult(tileBox).isColliding) {
               return true;
            }
         }
      }
   }

   return false;
}

// @Incomplete !

// const addSnapAxes = (snapAxes: Array<SnapAxis>, snapHitbox: Hitbox, placingHitbox: Hitbox): void => {
//    // @Temporary @Hack: we assume that all hitboxes are recetangles

//    for (let i = 0; i < 4; i++) {
//       const 
      
//       for (let j = 0; j < 4; j++) {
         
//       }
//    }
// }

// const addEntitySnapAxes = (snapAxes: Array<SnapAxis>, entity: Entity, placingEntityHitboxes: ReadonlyArray<Hitbox>): void => {
//    const transformComponent = TransformComponentArray.getComponent(entity);
//    for (const child of transformComponent.children) {
//       if (!entityChildIsHitbox(child)) {
//          continue;
//       }

//       const snapHitbox = child;

//       // Check each hitbox with each placing entity hitbox
//       for (const placingHitbox of placingEntityHitboxes) {
//          addSnapAxes(snapAxes, snapHitbox, placingHitbox);
//       }
//    }
// }

// const collectSnapAxes = (desiredPlacePosition: Point, desiredPlaceRotation: number, placingEntityType: EntityType, layer: Layer): ReadonlyArray<SnapAxis> => {
//    const entityPaarams = createStructureConfig(placingEntityType, desiredPlacePosition.copy(), desiredPlaceRotation);
//    const transformComponentPaarams = entityPaarams.serverComponentPaarams[ServerComponentType.transform]!;

//    const placingEntityHitboxes = transformComponentPaarams.children.filter(child => entityChildIsHitbox(child)) as Array<Hitbox>;

//    const snapAxes = new Array<SnapAxis>();
   
//    const entitiesInRange = getEntitiesInRange(layer, desiredPlacePosition.x, desiredPlacePosition.y, Settings.STRUCTURE_SNAP_RANGE);
//    for (const entity of entitiesInRange) {
//       addEntitySnapAxes(snapAxes, entity, placingEntityHitboxes);
//    }
// }

const structurePlaceIsValid = (hitboxes: ReadonlyArray<Hitbox>, layer: Layer): boolean => {
   // @Speed @Copynpaste: already done for candidates
   // @SUPAHACK!!!!
   if (structureIntersectsWithBuildingBlockingTiles(layer, hitboxes)) {
      return false;
   }

   // Make sure the structure wouldn't be in any walls
   for (const hitbox of hitboxes) {
      const box = hitbox.box;

      box.calculateBounds();
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

const calculateRegularPlacePosition = (placeOrigin: Point, placingEntityRotation: number, entityType: EntityType): Point => {
   // @Hack?
   if (entityType === EntityType.bracings) {
      const placePosition = polarVec2(Vars.STRUCTURE_PLACE_DISTANCE + Settings.TILE_SIZE * 0.5, placingEntityRotation);
      placePosition.add(placeOrigin);
      return placePosition;
   }
   
   // @SUPAHACK!!!!
   const entityComponentData = createStructureConfig(entityType, new Point(0, 0), 0);
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   let entityMinX = Number.MAX_SAFE_INTEGER;
   let entityMaxX = Number.MIN_SAFE_INTEGER;
   let entityMinY = Number.MAX_SAFE_INTEGER;
   let entityMaxY = Number.MIN_SAFE_INTEGER;
   
   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];
      const box = hitbox.box;

      box.calculateBounds();
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
   
   const placePosition = polarVec2(Vars.STRUCTURE_PLACE_DISTANCE + placeOffsetY, placingEntityRotation);
   placePosition.add(placeOrigin);
   return placePosition;
}

const getStructureSnapOrigin = (structure: Entity): Point => {
   // @Hack
   const transformComponent = TransformComponentArray.getComponent(structure);
   const hitbox = transformComponent.hitboxes[0];
   
   const snapOrigin = hitbox.box.position.copy();
   if (getEntityType(structure) === EntityType.embrasure) {
      snapOrigin.x -= 22 * Math.sin(hitbox.box.angle);
      snapOrigin.y -= 22 * Math.cos(hitbox.box.angle);
   }
   return snapOrigin;
}

const getSnapCandidatesOffConnectingEntity = (connectingEntity: Entity, desiredPlacePosition: Point, desiredPlaceRotation: number, entityType: EntityType, layer: Layer): ReadonlyArray<SnapCandidate> => {
   const connectingEntityTransformComponent = TransformComponentArray.getComponent(connectingEntity);
   const connectingEntityType = getEntityType(connectingEntity);
   
   // @SUPAHACK!!!!
   const entityComponentData = createStructureConfig(entityType, new Point(0, 0), 0);
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const placingEntityHitboxes = transformComponentData.hitboxes;
   const snapOrigin = getStructureSnapOrigin(connectingEntity);
   
   const snapPositions = new Array<SnapCandidate>();

   for (const placingEntityHitbox of placingEntityHitboxes) {
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
            const offsetDir = connectingEntityHitbox.box.angle + i * Math.PI / 2;
      
            const connectingEntityOffset = i % 2 === 0 ? hitboxHalfHeight : hitboxHalfWidth;
   
            const placingEntityAngle = alignAngleToClosestAxis(desiredPlaceRotation, connectingEntityHitbox.box.angle);
            
            let placingEntityOffset: number;
            // Direction to the snapping entity is opposite of the offset from the snapping entity
            const angleDiff = getAbsAngleDiff(offsetDir + Math.PI, placingEntityAngle);
            if (angleDiff < Math.PI * 0.5) {
               // Top or bottom is bing connected
               placingEntityOffset = placingEntityHitboxHalfHeight;
            } else {
               // Left or right is being connected
               placingEntityOffset = placingEntityHitboxHalfWidth;
            }

            const maxLength = Math.max(placingEntityHitboxHalfWidth * 2, (i % 2 === 0 ? hitboxHalfWidth : hitboxHalfHeight) * 2);
            const minLength = Math.min(placingEntityHitboxHalfWidth * 2, (i % 2 === 0 ? hitboxHalfWidth : hitboxHalfHeight) * 2);
            const positions = new Array<Point>();
            for (let xi = -1; xi <= 1; xi++) {
               const sideOffset = (maxLength - minLength) * 0.5 * xi;
               
               const position = polarVec2(connectingEntityOffset + placingEntityOffset, offsetDir);
               position.add(snapOrigin);
               position.x += sideOffset * Math.sin(offsetDir + Math.PI * 0.5);
               position.y += sideOffset * Math.cos(offsetDir + Math.PI * 0.5);
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

            // @SUPAHACK!!!!
            const entityComponentData = createStructureConfig(entityType, position, placingEntityAngle);
            const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
            const hitboxes = transformComponentData.hitboxes;
            
            // Don't add the position if it would be colliding with the connecting entity
            let isValid = true;
            const collidingEntities = getHitboxesCollidingEntities(layer, hitboxes, Vars.COLLISION_EPSILON);
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
                  hitboxes: hitboxes
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
            //       const collidingEntity = collidingEntities[l];
            //       if (collidingEntity === connectingEntity.id) {
            //          isValid = false;
            //          break;
            //       }
            //    }
      
            //    if (isValid) {
            //       snapPositions.push({
            //          position: position,
            //          rotation: placingEntityRotation,
            //          connectedEntity: connectingEntity.id
            //       });
            //    }
            // }
         }
      }
   }

   return snapPositions;
}

const findCandidatePlacePositions = (entityType: EntityType, desiredPlacePosition: Point, desiredPlaceRotation: number, layer: Layer): Array<SnapCandidate> => {
   const candidatePositions = new Array<SnapCandidate>();
   
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

   if (Math.abs(transform1.angle - transform2.angle) > Vars.MULTI_SNAP_ROTATION_TOLERANCE) {
      return false;
   }

   return true;
}

const getExistingGroup = (transform: SnapCandidate, groups: ReadonlyArray<Array<SnapCandidate>>): Array<SnapCandidate> | null => {
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

const groupTransforms = (transforms: ReadonlyArray<SnapCandidate>, entityType: EntityType, layer: Layer): ReadonlyArray<StructurePlaceInfo> => {
   const groups = new Array<Array<SnapCandidate>>();
   
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

   const placeInfos = new Array<StructurePlaceInfo>();
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const firstTransform = group[0];
      
      const connections = new Array<StructureConnection>();
      for (const transform of group) {
         // @Hack
         const connectingEntityTransformComponent = TransformComponentArray.getComponent(transform.connectedEntity);
         const connectingEntityHitbox = connectingEntityTransformComponent.hitboxes[0];
         
         const relativeOffsetDirection = calculateRelativeOffsetDirection(transform.position, transform.angle, connectingEntityHitbox.box.position);
         const connection = createStructureConnection(transform.connectedEntity, relativeOffsetDirection);
         connections.push(connection);
      }

      const placeInfo: StructurePlaceInfo = {
         position: firstTransform.position,
         rotation: firstTransform.angle,
         connections: connections,
         entityType: entityType,
         hitboxes: firstTransform.hitboxes,
         isValid: structurePlaceIsValid(firstTransform.hitboxes, layer)
      };
      placeInfos.push(placeInfo);
   }

   return placeInfos;
}

const filterCandidatePositions = (candidates: Array<SnapCandidate>, regularPlacePosition: Readonly<Point>): void => {
   for (let i = 0; i < candidates.length; i++) {
      const transform = candidates[i];

      if (transform.position.distanceTo(regularPlacePosition) > Settings.STRUCTURE_POSITION_SNAP) {
         candidates.splice(i, 1);
         i--;
      }
   }
}

const getNearbyTileCornerSubtiles = (regularPlacePosition: Point): ReadonlyArray<number> => {
   const minTileX = Math.floor(regularPlacePosition.x / Settings.TILE_SIZE);
   const maxTileX = Math.ceil(regularPlacePosition.x / Settings.TILE_SIZE);
   const minTileY = Math.floor(regularPlacePosition.y / Settings.TILE_SIZE);
   const maxTileY = Math.ceil(regularPlacePosition.y / Settings.TILE_SIZE);

   const tileCornerSubtiles = new Array<number>();
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
   
   if (!subtileIsInWorld(subtileX, subtileY)) {
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

   // 0 rotation - vertical, 90 deg rotation - horizontal
   const rotation = closestTileCornerSubtileY === secondClosestTileCornerSubtileY ? Math.PI / 2 : 0;
   
   // @SUPAHACK!!!!
   const entityComponentData = createStructureConfig(EntityType.bracings, position, rotation);
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitboxes = transformComponentData.hitboxes;
   
   if (structureIntersectsWithBuildingBlockingTiles(layer, hitboxes)) {
      isValid = false;
   }
   
   return {
      position: position,
      rotation: rotation,
      connections: [],
      entityType: EntityType.bracings,
      hitboxes: hitboxes,
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
      // @SUPAHACK!!!!
      const entityComponentData = createStructureConfig(entityType, desiredPlacePosition.copy(), desiredPlaceAngle);
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitboxes = transformComponentData.hitboxes;

      // If no connections are found, use the regular place position
      return {
         position: desiredPlacePosition,
         rotation: desiredPlaceAngle,
         connections: [],
         entityType: entityType,
         hitboxes: hitboxes,
         isValid: structurePlaceIsValid(hitboxes, layer)
      };
   } else {
      // @Incomplete:
      // - First filter by num snaps
      // - Then filter by proximity to regular place position

      return placeInfos[0];
   }
}

export function calculateEntityPlaceInfo(placeOrigin: Point, desiredPlaceRotation: number, entityType: EntityType, layer: Layer): StructurePlaceInfo {
   const regularPlacePosition = calculateRegularPlacePosition(placeOrigin, desiredPlaceRotation, entityType);
   return calculatePlaceInfo(regularPlacePosition, desiredPlaceRotation, entityType, layer);
}