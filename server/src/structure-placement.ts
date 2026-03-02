import { boxIsCircular } from "../../shared/src/boxes/boxes";
import { RectangularBox } from "../../shared/src/boxes/RectangularBox";
import { boxIsCollidingWithSubtile } from "../../shared/src/collision";
import { getEntityCollisionGroup, CollisionGroup } from "../../shared/src/collision-groups";
import { BlueprintType, BuildingMaterial, ServerComponentType } from "../../shared/src/components";
import { Entity, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { STRUCTURE_TYPES, StructureType } from "../../shared/src/structures";
import { getSubtileIndex, subtileIsInWorld, getSubtileX, getSubtileY } from "../../shared/src/subtiles";
import { SubtileType } from "../../shared/src/tiles";
import { Point, alignAngleToClosestAxis, getAbsAngleDiff, distance, getTileIndexIncludingEdges, polarVec2 } from "../../shared/src/utils";
import { getEntitiesInRange } from "./ai-shared";
import { getHitboxesCollidingEntities } from "./collision-detection";
import { EntityConfig } from "./components";
import { ItemComponentArray } from "./components/ItemComponent";
import { TransformComponentArray } from "./components/TransformComponent";
import { createBallistaConfig } from "./entities/structures/ballista";
import { createBarrelConfig } from "./entities/structures/barrel";
import { createBracingsConfig } from "./entities/structures/bracings";
import { createCampfireConfig } from "./entities/structures/cooking-entities/campfire";
import { createFurnaceConfig } from "./entities/structures/cooking-entities/furnace";
import { createAutomatonAssemblerConfig } from "./entities/structures/crafting-stations/automaton-assembler";
import { createMithrilAnvilConfig } from "./entities/structures/crafting-stations/mithril-anvil";
import { createDoorConfig } from "./entities/structures/door";
import { createEmbrasureConfig } from "./entities/structures/embrasure";
import { createFenceConfig } from "./entities/structures/fence";
import { createFenceGateConfig } from "./entities/structures/fence-gate";
import { createFireTorchConfig } from "./entities/structures/fire-torch";
import { createFloorSignConfig } from "./entities/structures/floor-sign";
import { createFrostshaperConfig } from "./entities/structures/frostshaper";
import { createHealingTotemConfig } from "./entities/structures/healing-totem";
import { createPlanterBoxConfig } from "./entities/structures/planter-box";
import { createFloorPunjiSticksConfig } from "./entities/structures/punji-sticks-floor";
import { createWallPunjiSticksConfig } from "./entities/structures/punji-sticks-wall";
import { createResearchBenchConfig } from "./entities/structures/research-bench";
import { createSlingTurretConfig } from "./entities/structures/sling-turret";
import { createSlurbTorchConfig } from "./entities/structures/slurb-torch";
import { createFloorSpikesConfig } from "./entities/structures/spikes-floor";
import { createWallSpikesConfig } from "./entities/structures/spikes-wall";
import { createStonecarvingTableConfig } from "./entities/structures/stonecarving-table";
import { createTribeTotemConfig } from "./entities/structures/tribe-totem";
import { createTunnelConfig } from "./entities/structures/tunnel";
import { createWallConfig } from "./entities/structures/wall";
import { createWarriorHutConfig } from "./entities/structures/warrior-hut";
import { createWorkbenchConfig } from "./entities/structures/workbench";
import { createWorkerHutConfig } from "./entities/structures/worker-hut";
import { createCogwalkerConfig } from "./entities/tribes/automatons/cogwalker";
import { createScrappyConfig } from "./entities/tribes/automatons/scrappy";
import { Hitbox } from "./hitboxes";
import Layer from "./Layer";
import Tribe from "./Tribe";
import { getEntityType, getTribes } from "./world";

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
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

export interface StructureConnection {
   readonly entity: Entity;
   readonly relativeOffsetDirection: number;
}

export interface StructurePlaceInfo {
   readonly position: Point;
   readonly angle: number;
   readonly entityType: EntityType;
   readonly connections: Array<StructureConnection>;
   readonly hitboxes: ReadonlyArray<Hitbox>;
   readonly isValid: boolean;
}

export function entityIsStructure(entityType: EntityType): entityType is StructureType {
   return STRUCTURE_TYPES.indexOf(entityType as StructureType) !== -1;
}

export function calculateRelativeOffsetDirection(entityPosition: Point, entityAngle: number, connectingEntityPosition: Point): number {
   // Relative angle of the offset (relative to the entity)
   let relativeOffsetDirection = entityPosition.angleTo(connectingEntityPosition);
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

export function createStructureConfig(tribe: Tribe, entityType: EntityType, position: Point, angle: number, connections: Array<StructureConnection>): EntityConfig {
   let config: EntityConfig;
   switch (entityType) {
      case EntityType.wall: config = createWallConfig(position, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.door: config = createDoorConfig(position, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.embrasure: config = createEmbrasureConfig(position, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.floorSpikes: config = createFloorSpikesConfig(position, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.wallSpikes: config = createWallSpikesConfig(position, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.tunnel: config = createTunnelConfig(position, angle, tribe, BuildingMaterial.wood, connections, null); break;
      case EntityType.floorPunjiSticks: config = createFloorPunjiSticksConfig(position, angle, tribe, connections, null); break;
      case EntityType.wallPunjiSticks: config = createWallPunjiSticksConfig(position, angle, tribe, connections, null); break;
      case EntityType.ballista: config = createBallistaConfig(position, angle, tribe, connections, null); break;
      case EntityType.slingTurret: config = createSlingTurretConfig(position, angle, tribe, connections, null); break;
      case EntityType.tribeTotem: config = createTribeTotemConfig(position, angle, tribe, connections, null); break;
      case EntityType.workerHut: config = createWorkerHutConfig(position, angle, tribe, connections, null); break;
      case EntityType.warriorHut: config = createWarriorHutConfig(position, angle, tribe, connections, null); break;
      case EntityType.barrel: config = createBarrelConfig(position, angle, tribe, connections, null); break;
      case EntityType.workbench: config = createWorkbenchConfig(position, angle, tribe, connections, null); break;
      case EntityType.researchBench: config = createResearchBenchConfig(position, angle, tribe, connections, null); break;
      case EntityType.healingTotem: config = createHealingTotemConfig(position, angle, tribe, connections, null); break;
      case EntityType.planterBox: config = createPlanterBoxConfig(position, angle, tribe, connections, null); break;
      case EntityType.furnace: config = createFurnaceConfig(position, angle, tribe, connections, null); break;
      case EntityType.campfire: config = createCampfireConfig(position, angle, tribe, connections, null); break;
      case EntityType.fence: config = createFenceConfig(position, angle, tribe, connections, null); break;
      case EntityType.fenceGate: config = createFenceGateConfig(position, angle, tribe, connections, null); break;
      case EntityType.frostshaper: config = createFrostshaperConfig(position, angle, tribe, connections, null); break;
      case EntityType.stonecarvingTable: config = createStonecarvingTableConfig(position, angle, tribe, connections, null); break;
      case EntityType.bracings: config = createBracingsConfig(position, angle, tribe, BuildingMaterial.wood, null); break;
      case EntityType.fireTorch: config = createFireTorchConfig(position, angle, tribe, connections, null); break;
      case EntityType.slurbTorch: config = createSlurbTorchConfig(position, angle, tribe, connections, null); break;
      // @Temporary
      case EntityType.scrappy: config = createScrappyConfig(position, angle, tribe); break;
      // case EntityType.scrappy: config = createBlueprintEntityConfig(tribe, BlueprintType.scrappy, 0, null); break;
      // @Temporary
      case EntityType.cogwalker: config = createCogwalkerConfig(position, angle, tribe); break;
      // case EntityType.cogwalker: config = createBlueprintEntityConfig(tribe, BlueprintType.cogwalker, 0, null); break;
      case EntityType.automatonAssembler: config = createAutomatonAssemblerConfig(position, angle, tribe, connections, null); break;
      case EntityType.mithrilAnvil: config = createMithrilAnvilConfig(position, angle, tribe, connections, null); break;
      case EntityType.floorSign: config = createFloorSignConfig(position, angle, tribe, connections, null); break;
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

      const minTileX = Math.floor(box.calculateBoundsMinX() / Settings.TILE_SIZE);
      const maxTileX = Math.floor(box.calculateBoundsMaxX() / Settings.TILE_SIZE);
      const minTileY = Math.floor(box.calculateBoundsMinY() / Settings.TILE_SIZE);
      const maxTileY = Math.floor(box.calculateBoundsMaxY() / Settings.TILE_SIZE);

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

const structurePlaceIsValid = (hitboxes: ReadonlyArray<Hitbox>, layer: Layer): boolean => {
   // @Investigate: Why is this only called for structure placements which don't snap?
   
   if (structureIntersectsWithBuildingBlockingTiles(layer, hitboxes)) {
      return false;
   }

   // Make sure the structure wouldn't be in any walls
   for (const hitbox of hitboxes) {
      const box = hitbox.box;

      const minSubtileX = Math.floor(box.calculateBoundsMinX() / Settings.SUBTILE_SIZE);
      const maxSubtileX = Math.floor(box.calculateBoundsMaxX() / Settings.SUBTILE_SIZE);
      const minSubtileY = Math.floor(box.calculateBoundsMinY() / Settings.SUBTILE_SIZE);
      const maxSubtileY = Math.floor(box.calculateBoundsMaxY() / Settings.SUBTILE_SIZE);

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
   const entityConfig = createStructureConfig(tribe, entityType, new Point(0, 0), 0, []);
   const transformComponent = entityConfig.components[ServerComponentType.transform]!;

   let entityMinX = Number.MAX_SAFE_INTEGER;
   let entityMaxX = Number.MIN_SAFE_INTEGER;
   let entityMinY = Number.MAX_SAFE_INTEGER;
   let entityMaxY = Number.MIN_SAFE_INTEGER;
   
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();
      
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
   
   const snapOrigin = hitbox.box.position.copy();
   if (getEntityType(structure) === EntityType.embrasure) {
      snapOrigin.x -= 22 * Math.sin(hitbox.box.angle);
      snapOrigin.y -= 22 * Math.cos(hitbox.box.angle);
   }
   return snapOrigin;
}

const getSnapCandidatesOffConnectingEntity = (connectingEntity: Entity, desiredPlacePosition: Point, desiredPlaceAngle: number, entityType: EntityType, layer: Layer): ReadonlyArray<SnapCandidate> => {
   const connectingEntityTransformComponent = TransformComponentArray.getComponent(connectingEntity);
   const connectingEntityType = getEntityType(connectingEntity);
   
   // @HACK
   const tribe = getTribes()[0];
   const entityConfig = createStructureConfig(tribe, entityType, new Point(0, 0), 0, []);
   const transformComponent = entityConfig.components[ServerComponentType.transform]!;
   
   const snapOrigin = getStructureSnapOrigin(connectingEntity);
   
   const snapPositions = new Array<SnapCandidate>();

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
            const positions = new Array<Point>();
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
            const entityConfig = createStructureConfig(tribe, entityType, position.copy(), placingEntityAngle, []);
            const transformComponent = entityConfig.components[ServerComponentType.transform]!;
            
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

   if (Math.abs(transform1.angle - transform2.angle) > Vars.MULTI_SNAP_ANGLE_TOLERANCE) {
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

   if (typeof closestTileCorner === "undefined" || typeof secondClosestTileCorner === "undefined") {
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
   const entityConfig = createStructureConfig(tribe, EntityType.bracings, position, angle, []);
   const transformComponent = entityConfig.components[ServerComponentType.transform]!;
   
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
      const entityConfig = createStructureConfig(tribe, entityType, desiredPlacePosition.copy(), desiredPlaceAngle, []);
      const transformComponent = entityConfig.components[ServerComponentType.transform]!;
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