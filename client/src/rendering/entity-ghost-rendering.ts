import { Point, lerp, randFloat, rotateXAroundOrigin, rotateXAroundPoint, rotateYAroundOrigin, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType, PlaceableItemType } from "webgl-test-shared/dist/items";
import { StructureType } from "webgl-test-shared/dist/structures";
import Player, { getPlayerSelectedItem } from "../entities/Player";
import { gl, createWebGLProgram, CAMERA_UNIFORM_BUFFER_BINDING_INDEX } from "../webgl";
import { PLACEABLE_ENTITY_INFO_RECORD, calculatePlacePosition, calculatePlaceRotation, calculateSnapInfo, canPlaceItem } from "../player-input";
import { ENTITY_TEXTURE_ATLAS, ENTITY_TEXTURE_ATLAS_SIZE, ENTITY_TEXTURE_SLOT_INDEXES, getTextureArrayIndex, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { getHoveredEntityID, getSelectedEntityID } from "../entity-selection";
import Entity from "../Entity";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "../utils";
import { getHoveredGhostType } from "../components/game/BuildMenu";
import WorkerHut from "../entities/WorkerHut";
import WarriorHut from "../entities/WarriorHut";
import OPTIONS from "../options";
import { calculatePotentialPlanIdealness, getHoveredBuildingPlan, getPotentialPlanStats, getVisibleBuildingPlans } from "../client/Client";
import { SEED_TO_PLANT_RECORD } from "../entity-components/PlantComponent";
import { NUM_LARGE_COVER_LEAVES, NUM_SMALL_COVER_LEAVES } from "../entity-components/SpikesComponent";

// @Temporary
// // Detect the entity types which need ghosts
// type PlaceableItemInfoRecord = {
//    [T in PlaceableItemType]: (typeof ITEM_INFO_RECORD)[T];
// }
// type PlaceableItemEntityRecord = {
//    [T in PlaceableItemType]: (PlaceableItemInfoRecord[T])["entityType"];
// }
// type GhostEntityType = PlaceableItemEntityRecord[PlaceableItemType];

export enum GhostType {
   deconstructMarker,
   recallMarker,
   coverLeaves,
   treeSeed,
   berryBushSeed,
   iceSpikesSeed,
   campfire,
   furnace,
   tribeTotem,
   workbench,
   barrel,
   workerHut,
   warriorHut,
   researchBench,
   planterBox,
   woodenSpikes,
   punjiSticks,
   woodenDoor,
   stoneDoor,
   stoneDoorUpgrade,
   woodenEmbrasure,
   stoneEmbrasure,
   stoneEmbrasureUpgrade,
   woodenWall,
   stoneWall,
   woodenTunnel,
   stoneTunnel,
   stoneTunnelUpgrade,
   tunnelDoor,
   ballista,
   slingTurret,
   stoneFloorSpikes,
   stoneWallSpikes,
   healingTotem,
   fence,
   fenceGate
}

interface GhostInfo {
   readonly position: Point;
   readonly rotation: number;
   readonly ghostType: GhostType;
   readonly snappedEntities: ReadonlyArray<Entity>;
   readonly tint: [number, number, number];
   readonly opacity: number;
}

interface TextureInfo {
   readonly textureSource: string;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

const PARTIAL_OPACITY = 0.5;

// @Robustness: Should automatically detect which entity types to have an entry for
const ENTITY_TYPE_TO_GHOST_TYPE_MAP: Record<StructureType, GhostType> = {
   [EntityType.campfire]: GhostType.campfire,
   [EntityType.furnace]: GhostType.furnace,
   [EntityType.tribeTotem]: GhostType.tribeTotem,
   [EntityType.workbench]: GhostType.workbench,
   [EntityType.barrel]: GhostType.barrel,
   [EntityType.workerHut]: GhostType.workerHut,
   [EntityType.warriorHut]: GhostType.warriorHut,
   [EntityType.researchBench]: GhostType.researchBench,
   [EntityType.planterBox]: GhostType.planterBox,
   [EntityType.floorSpikes]: GhostType.woodenSpikes,
   [EntityType.wallSpikes]: GhostType.woodenSpikes,
   [EntityType.floorPunjiSticks]: GhostType.punjiSticks,
   [EntityType.wallPunjiSticks]: GhostType.punjiSticks,
   [EntityType.door]: GhostType.woodenDoor,
   [EntityType.embrasure]: GhostType.woodenEmbrasure,
   [EntityType.wall]: GhostType.woodenWall,
   [EntityType.tunnel]: GhostType.woodenTunnel,
   [EntityType.ballista]: GhostType.ballista,
   [EntityType.slingTurret]: GhostType.slingTurret,
   [EntityType.healingTotem]: GhostType.healingTotem,
   [EntityType.fence]: GhostType.fence,
   [EntityType.fenceGate]: GhostType.fenceGate
};

const generateCoverLeavesTextureInfo = (isSmall: boolean): TextureInfo => {
   const spawnRange = isSmall ? 24 : 18;

   return {
      textureSource: isSmall ? "entities/miscellaneous/cover-leaf-small.png" : "entities/miscellaneous/cover-leaf-large.png",
      offsetX: randFloat(-spawnRange, spawnRange),
      offsetY: randFloat(-spawnRange, spawnRange),
      rotation: 2 * Math.PI * Math.random()
   };
}

const generateCoverLeavesTextureInfoArray = (): ReadonlyArray<TextureInfo> => {
   const textureInfoArray = new Array<TextureInfo>();
   for (let i = 0; i < NUM_SMALL_COVER_LEAVES; i++) {
      textureInfoArray.push(generateCoverLeavesTextureInfo(true));
   }
   for (let i = 0; i < NUM_LARGE_COVER_LEAVES; i++) {
      textureInfoArray.push(generateCoverLeavesTextureInfo(false));
   }
   return textureInfoArray;
}

let program: WebGLProgram;

export function createPlaceableItemProgram(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_textureIndex;
   layout(location = 3) in vec2 a_textureSize;
   layout(location = 4) in float a_opacity;
   layout(location = 5) in vec3 a_tint;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   out vec2 v_textureSize;
   out float v_opacity;
   out vec3 v_tint;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureIndex = a_textureIndex;
      v_textureSize = a_textureSize;
      v_opacity = a_opacity;
      v_tint = a_tint;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_textureAtlas;
   uniform float u_atlasPixelSize;
   uniform float u_atlasSlotSize;
   
   in vec2 v_texCoord;
   in float v_textureIndex;
   in vec2 v_textureSize;
   in float v_opacity;
   in vec3 v_tint;
   
   out vec4 outputColour;
   
   void main() {
      // Calculate the coordinates of the top left corner of the texture
      float textureX = mod(v_textureIndex * u_atlasSlotSize, u_atlasPixelSize);
      float textureY = floor(v_textureIndex * u_atlasSlotSize / u_atlasPixelSize) * u_atlasSlotSize;
      
      // @Incomplete: This is very hacky, the - 0.2 and + 0.1 shenanigans are to prevent texture bleeding but it causes tiny bits of the edge of the textures to get cut off.
      float u = (textureX + v_texCoord.x * (v_textureSize.x - 0.2) + 0.1) / u_atlasPixelSize;
      float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * (v_textureSize.y - 0.2) + 0.1) / u_atlasPixelSize);
      outputColour = texture(u_textureAtlas, vec2(u, v));

      outputColour.rgb *= v_tint;
      outputColour.a *= v_opacity;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
   
   gl.useProgram(program);

   const programTextureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   const atlasPixelSizeUniformLocation = gl.getUniformLocation(program, "u_atlasPixelSize")!;
   const atlasSlotSizeUniformLocation = gl.getUniformLocation(program, "u_atlasSlotSize")!;

   gl.uniform1i(programTextureUniformLocation, 0);
   gl.uniform1f(atlasPixelSizeUniformLocation, ENTITY_TEXTURE_ATLAS_SIZE);
   gl.uniform1f(atlasSlotSizeUniformLocation, ATLAS_SLOT_SIZE);
}

const isAttachedToWall = (ghostInfo: GhostInfo): boolean => {
   for (let i = 0; i < ghostInfo.snappedEntities.length; i++) {
      const entity = ghostInfo.snappedEntities[i];
      if (entity.type === EntityType.wall) {
         return true;
      }
   }
   return false;
}

const getGhostTextureInfoArray = (ghostInfo: GhostInfo): ReadonlyArray<TextureInfo> => {
   switch (ghostInfo.ghostType) {
      case GhostType.deconstructMarker: return [
         {
            textureSource: "entities/deconstruct-marker.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.recallMarker: return [
         {
            textureSource: "entities/recall-marker.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.coverLeaves: {
         return generateCoverLeavesTextureInfoArray();
      }
      case GhostType.treeSeed: return [
         {
            textureSource: "entities/plant/tree-sapling-1.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.berryBushSeed: return [
         {
            textureSource: "entities/plant/berry-bush-sapling-1.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.iceSpikesSeed: return [
         {
            textureSource: "entities/plant/ice-spikes-sapling-1.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.campfire: return [
         {
            textureSource: "entities/campfire/campfire.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.furnace: return [
         {
            textureSource: "entities/furnace/furnace.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.tribeTotem: return [
         {
            textureSource: "entities/tribe-totem/tribe-totem.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.workbench: return [
         {
            textureSource: "entities/workbench/workbench.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.barrel: return [
         {
            textureSource: "entities/barrel/barrel.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.workerHut: return [
         {
            textureSource: "entities/worker-hut/worker-hut-door.png",
            offsetX: 0,
            offsetY: WorkerHut.SIZE / 2,
            rotation: Math.PI/2
         },
         {
            textureSource: "entities/worker-hut/worker-hut.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.warriorHut: return [
         {
            textureSource: "entities/warrior-hut/warrior-hut-door.png",
            offsetX: -20,
            offsetY: WarriorHut.SIZE / 2,
            rotation: Math.PI/2
         },
         {
            textureSource: "entities/warrior-hut/warrior-hut-door.png",
            offsetX: 20,
            offsetY: WarriorHut.SIZE / 2,
            rotation: Math.PI * 3/2
         },
         {
            textureSource: "entities/warrior-hut/warrior-hut.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.researchBench: return [
         {
            textureSource: "entities/research-bench/research-bench.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.planterBox: return [
         {
            textureSource: "entities/planter-box/planter-box.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.woodenSpikes: return [
         {
            textureSource: isAttachedToWall(ghostInfo) ? "entities/spikes/wooden-wall-spikes.png" : "entities/spikes/wooden-floor-spikes.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.punjiSticks: return [
         {
            textureSource: isAttachedToWall(ghostInfo) ? "entities/wall-punji-sticks/wall-punji-sticks.png" : "entities/floor-punji-sticks/floor-punji-sticks.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.woodenDoor: return [
         {
            textureSource: "entities/door/wooden-door.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.stoneDoor: return [
         {
            textureSource: "entities/door/stone-door.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      // @Cleanup
      case GhostType.stoneDoorUpgrade: return [
         {
            textureSource: "entities/door/stone-door.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.woodenEmbrasure: return [
         {
            textureSource: "entities/embrasure/wooden-embrasure.png",
            offsetX: 0,
            offsetY: 22,
            rotation: 0
         }
      ];
      case GhostType.stoneEmbrasure: return [
         {
            textureSource: "entities/embrasure/stone-embrasure.png",
            offsetX: 0,
            offsetY: 22,
            rotation: 0
         }
      ];
      // @Cleanup
      case GhostType.stoneEmbrasureUpgrade: return [
         {
            textureSource: "entities/embrasure/stone-embrasure.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.woodenWall: return [
         {
            textureSource: "entities/wall/wooden-wall.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.stoneWall: return [
         {
            textureSource: "entities/wall/stone-wall.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.woodenTunnel: return [
         {
            textureSource: "entities/tunnel/wooden-tunnel.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.stoneTunnel: return [
         {
            textureSource: "entities/tunnel/stone-tunnel.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      // @Cleanup
      case GhostType.stoneTunnelUpgrade: return [
         {
            textureSource: "entities/tunnel/stone-tunnel.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.tunnelDoor: return [
         {
            textureSource: "entities/tunnel/tunnel-door.png",
            offsetX: 0,
            offsetY: 32,
            rotation: 0
         }
      ];
      case GhostType.ballista: return [
         { // Base
            textureSource: "entities/ballista/base.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         },
         { // Left gear
            textureSource: "entities/ballista/gear.png",
            offsetX: BALLISTA_GEAR_X,
            offsetY: BALLISTA_GEAR_Y,
            rotation: 0
         },
         { // Right gear
            textureSource: "entities/ballista/gear.png",
            offsetX: -BALLISTA_GEAR_X,
            offsetY: BALLISTA_GEAR_Y,
            rotation: 0
         },
         { // Ammo box
            textureSource: "entities/ballista/ammo-box.png",
            offsetX: BALLISTA_AMMO_BOX_OFFSET_X,
            offsetY: BALLISTA_AMMO_BOX_OFFSET_Y,
            rotation: Math.PI / 2
         },
         { // Shaft
            textureSource: "entities/ballista/shaft.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         },
         { // Crossbow
            textureSource: "entities/ballista/crossbow-1.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         },
      ];
      case GhostType.slingTurret: return [
         { // Base
            textureSource: "entities/sling-turret/sling-turret-base.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         },
         { // Plate
            textureSource: "entities/sling-turret/sling-turret-plate.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         },
         { // Sling
            textureSource: "entities/sling-turret/sling-turret-sling.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.stoneFloorSpikes: return [
         {
            textureSource: "entities/spikes/stone-floor-spikes.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.stoneWallSpikes: return [
         {
            textureSource: "entities/spikes/stone-wall-spikes.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      case GhostType.healingTotem: return [
         {
            textureSource: "entities/healing-totem/healing-totem.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
      // @Temporary
      case GhostType.fence: {
         const textureInfoArray = new Array<TextureInfo>();

         textureInfoArray.push({
            textureSource: "entities/fence/fence-node.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         });

         return textureInfoArray;
      }
      // @Temporary
      case GhostType.fenceGate: return [
         {
            textureSource: "entities/fence-gate/fence-gate-door.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         },
         {
            textureSource: "entities/fence-gate/fence-gate-sides.png",
            offsetX: 0,
            offsetY: 0,
            rotation: 0
         }
      ];
   }
}

const calculateVertices = (ghostInfos: ReadonlyArray<GhostInfo>): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   for (let i = 0; i < ghostInfos.length; i++) {
      const ghostInfo = ghostInfos[i];

      // @Speed: cache
      const textureInfoArray = getGhostTextureInfoArray(ghostInfo);
      for (let i = 0; i < textureInfoArray.length; i++) {
         const textureInfo = textureInfoArray[i];
      
         // Find texture size
         const textureArrayIndex = getTextureArrayIndex(textureInfo.textureSource);
         const textureWidth = getTextureWidth(textureArrayIndex);
         const textureHeight = getTextureHeight(textureArrayIndex);
         const width = textureWidth * 4;
         const height = textureHeight * 4;
         const slotIndex = ENTITY_TEXTURE_SLOT_INDEXES[textureArrayIndex];
         
         const x = ghostInfo.position.x + rotateXAroundOrigin(textureInfo.offsetX, textureInfo.offsetY, ghostInfo.rotation);
         const y = ghostInfo.position.y + rotateYAroundOrigin(textureInfo.offsetX, textureInfo.offsetY, ghostInfo.rotation);
         
         const x1 = x - width / 2;
         const x2 = x + width / 2;
         const y1 = y - height / 2;
         const y2 = y + height / 2;
      
         // @Cleanup: hard-coded
         const rotation = (ghostInfo.ghostType !== GhostType.deconstructMarker && ghostInfo.ghostType !== GhostType.recallMarker) ? ghostInfo.rotation + textureInfo.rotation : 0;
         const tlX = rotateXAroundPoint(x1, y2, x, y, rotation);
         const tlY = rotateYAroundPoint(x1, y2, x, y, rotation);
         const trX = rotateXAroundPoint(x2, y2, x, y, rotation);
         const trY = rotateYAroundPoint(x2, y2, x, y, rotation);
         const blX = rotateXAroundPoint(x1, y1, x, y, rotation);
         const blY = rotateYAroundPoint(x1, y1, x, y, rotation);
         const brX = rotateXAroundPoint(x2, y1, x, y, rotation);
         const brY = rotateYAroundPoint(x2, y1, x, y, rotation);
      
         vertices.push(
            blX, blY, 0, 0, slotIndex, textureWidth, textureHeight, ghostInfo.opacity, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2],
            brX, brY, 1, 0, slotIndex, textureWidth, textureHeight, ghostInfo.opacity, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2],
            tlX, tlY, 0, 1, slotIndex, textureWidth, textureHeight, ghostInfo.opacity, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2],
            tlX, tlY, 0, 1, slotIndex, textureWidth, textureHeight, ghostInfo.opacity, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2],
            brX, brY, 1, 0, slotIndex, textureWidth, textureHeight, ghostInfo.opacity, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2],
            trX, trY, 1, 1, slotIndex, textureWidth, textureHeight, ghostInfo.opacity, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2]
         );
      }
   }

   return vertices;
}

const getGhostRotation = (building: Entity, ghostType: GhostType): number => {
   switch (ghostType) {
      case GhostType.tunnelDoor: {
         const tunnelComponent = building.getServerComponent(ServerComponentType.tunnel);
         switch (tunnelComponent.doorBitset) {
            case 0b00: {
               // Show the door closest to the player
               const dirToPlayer = building.position.calculateAngleBetween(Player.instance!.position);
               const dot = Math.sin(building.rotation) * Math.sin(dirToPlayer) + Math.cos(building.rotation) * Math.cos(dirToPlayer);

               return dot > 0 ? building.rotation : building.rotation + Math.PI;
            }
            case 0b01: {
               // Show bottom door
               return building.rotation + Math.PI;
            }
            case 0b10: {
               // Show top door
               return building.rotation;
            }
            default: {
               throw new Error("Unknown door bitset " + tunnelComponent.doorBitset);
            }
         }
      }
      case GhostType.stoneDoorUpgrade:
      case GhostType.stoneEmbrasureUpgrade:
      case GhostType.stoneTunnelUpgrade:
      case GhostType.stoneFloorSpikes:
      case GhostType.stoneWallSpikes:
      case GhostType.coverLeaves:
      case GhostType.warriorHut: {
         return building.rotation;
      }
      default: {
         return snapRotationToPlayer(building, building.rotation);
      }
   }
}

const snapRotationToPlayer = (structure: Entity, rotation: number): number => {
   const playerDirection = Player.instance!.position.calculateAngleBetween(structure.position);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

const getPlantGhostType = (): GhostType | null => {
   const hoveredEntityID = getHoveredEntityID();
   if (hoveredEntityID === -1) {
      return null;
   }

   const hoveredEntity = Board.entityRecord[hoveredEntityID];
   if (hoveredEntity.type !== EntityType.planterBox) {
      return null;
   }

   const selectedItem = getPlayerSelectedItem();
   if (selectedItem === null || typeof SEED_TO_PLANT_RECORD[selectedItem.type] === "undefined") {
      return null;
   }

   const planterBoxComponent = hoveredEntity.getServerComponent(ServerComponentType.planterBox);
   if (planterBoxComponent.hasPlant) {
      return null;
   }

   switch (selectedItem.type) {
      case ItemType.seed: {
         return GhostType.treeSeed;
      }
      case ItemType.berry: {
         return GhostType.berryBushSeed;
      }
      case ItemType.frostcicle: {
         return GhostType.iceSpikesSeed;
      }
      default: {
         throw new Error();
      }
   }
}

const getGhostInfo = (): GhostInfo | null => {
   // Placeable item ghost
   const playerSelectedItem = getPlayerSelectedItem();
   if (playerSelectedItem !== null && PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(playerSelectedItem.type)) {
      const placeableEntityInfo = PLACEABLE_ENTITY_INFO_RECORD[playerSelectedItem.type as PlaceableItemType];
      
      const snapInfo = calculateSnapInfo(placeableEntityInfo, true);
      const placePosition = calculatePlacePosition(placeableEntityInfo, snapInfo, true);
      const placeRotation = calculatePlaceRotation(snapInfo);

      const isPlacedOnWall = snapInfo !== null && Board.entityRecord[snapInfo.snappedEntityID].type === EntityType.wall;
      const canPlace = canPlaceItem(placePosition, placeRotation, playerSelectedItem, snapInfo !== null ? snapInfo.entityType : placeableEntityInfo.entityType, isPlacedOnWall);

      return {
         position: placePosition,
         rotation: placeRotation,
         ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[placeableEntityInfo.entityType],
         tint: canPlace ? [1, 1, 1] : [1.5, 0.5, 0.5],
         snappedEntities: snapInfo !== null ? [Board.entityRecord[snapInfo.snappedEntityID]] : [],
         opacity: PARTIAL_OPACITY
      };
   }

   // Blueprint ghost
   const hoveredGhostType = getHoveredGhostType();
   if (hoveredGhostType !== null) {
      const selectedStructureID = getSelectedEntityID();
      const selectedStructure = Board.entityRecord[selectedStructureID];

      if (typeof selectedStructure !== "undefined") {
         return {
            position: selectedStructure.position.copy(),
            rotation: getGhostRotation(selectedStructure, hoveredGhostType),
            ghostType: hoveredGhostType,
            snappedEntities: [],
            tint: [1, 1, 1],
            opacity: hoveredGhostType === GhostType.deconstructMarker ? 0.8 : PARTIAL_OPACITY
         };
      }
   }

   // Plant ghost
   const plantGhostType = getPlantGhostType();
   if (plantGhostType !== null) {
      const hoveredEntityID = getHoveredEntityID();
      const hoveredEntity = Board.entityRecord[hoveredEntityID];

      return {
         position: hoveredEntity.position,
         rotation: hoveredEntity.rotation,
         ghostType: plantGhostType,
         snappedEntities: [],
         tint: [1, 1, 1],
         opacity: PARTIAL_OPACITY
      };
   }

   return null;
}

export function renderGhostEntities(): void {
   if (Player.instance === null) {
      return;
   }

   const ghostInfos = new Array<GhostInfo>();

   const ghostInfo = getGhostInfo();
   if (ghostInfo !== null) {
      ghostInfos.push(ghostInfo);
   }

   // Building plans
   if (OPTIONS.showBuildingPlans) {
      const buildingPlans = getVisibleBuildingPlans();
      for (let i = 0; i < buildingPlans.length; i++) {
         const plan = buildingPlans[i];
         
         ghostInfos.push({
            position: new Point(plan.x, plan.y),
            rotation: plan.rotation,
            ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[plan.entityType],
            snappedEntities: [],
            opacity: 0.5,
            tint: [0.9, 1.5, 0.8]
         });
      }

      // Potential building plans
      const hoveredBuildingPlan = getHoveredBuildingPlan();
      if (hoveredBuildingPlan !== null && hoveredBuildingPlan.potentialBuildingPlans.length > 0) {
         const plan = hoveredBuildingPlan;
   
         const firstPlan = plan.potentialBuildingPlans[0];
         let minPlanSafety = firstPlan.safety;
         let maxPlanSafety = firstPlan.safety;
         for (let i = 1; i < plan.potentialBuildingPlans.length; i++) {
            const potentialPlan = plan.potentialBuildingPlans[i];
            if (potentialPlan.safety < minPlanSafety) {
               minPlanSafety = potentialPlan.safety;
            } else if (potentialPlan.safety > maxPlanSafety) {
               maxPlanSafety = potentialPlan.safety;
            }
         }
   
         const potentialPlans = plan.potentialBuildingPlans;
         const stats = getPotentialPlanStats(potentialPlans);
         for (let i = 0; i < plan.potentialBuildingPlans.length; i++) {
            const potentialPlan = plan.potentialBuildingPlans[i];
   
            const idealness = calculatePotentialPlanIdealness(potentialPlan, stats);
   
            ghostInfos.push({
               position: new Point(potentialPlan.x, potentialPlan.y),
               rotation: potentialPlan.rotation,
               ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[potentialPlan.buildingType],
               snappedEntities: [],
               opacity: lerp(0.15, 0.6, idealness),
               tint: [1.2, 1.4, 0.8]
            });
         }
      }
   }
   
   if (ghostInfos.length === 0) {
      return;
   }

   const vertices = calculateVertices(ghostInfos);

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer = gl.createBuffer()!; // @Speed
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); // @Speed

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(4);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, ENTITY_TEXTURE_ATLAS);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 11);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}