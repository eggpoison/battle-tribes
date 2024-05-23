import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point, distance, rotateXAroundOrigin, rotateXAroundPoint, rotateYAroundOrigin, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import { getHighlightedEntityID, getSelectedEntityID } from "../entity-selection";
import { createWebGLProgram, gl, CAMERA_UNIFORM_BUFFER_BINDING_INDEX, TIME_UNIFORM_BUFFER_BINDING_INDEX, CIRCLE_VERTEX_COUNT } from "../webgl";
import Entity from "../Entity";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../utils";
import { playerIsHoldingHammer } from "../game-state/game-states";
import Game from "../Game";
import { getTunnelDoorInfo } from "../entity-components/TunnelComponent";
import { getFenceGateDoorInfo } from "../entity-components/FenceGateComponent";

const THICKNESS = 4;

interface HighlightInfo {
   readonly width: number;
   readonly height: number;
   readonly isCircle: boolean;
   readonly xOffset: number;
   readonly yOffset: number;
   readonly rotation: number;
   readonly group: number;
}

type HighlightInfoGroup = ReadonlyArray<HighlightInfo>;

const getEntityHighlightInfoArray = (entity: Entity): ReadonlyArray<HighlightInfoGroup> => {
   switch (entity.type) {
      case EntityType.wall: return [
         [{
            width: 64,
            height: 64,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.door: return [
         [{
            width: 64,
            height: 24,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.researchBench: return [
         [{
            width: 32 * 4,
            height: 20 * 4,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.barrel: return [
         [{
            width: 80,
            height: 80,
            isCircle: true,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.tribeWorker: return [
         [{
            width: 56,
            height: 56,
            isCircle: true,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.tribeWarrior: return [
         [{
            width: 64,
            height: 64,
            isCircle: true,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.campfire: return [
         [{
            width: 90,
            height: 90,
            isCircle: true,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.furnace: return [
         [{
            width: 80,
            height: 80,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.ballista: return [
         [{
            width: 44,
            height: 36,
            isCircle: false,
            xOffset: BALLISTA_AMMO_BOX_OFFSET_X,
            yOffset: BALLISTA_AMMO_BOX_OFFSET_Y,
            rotation: Math.PI / 2,
            group: 0
         }]
      ];
      case EntityType.tunnel: {
         const highlightInfoArray = new Array<HighlightInfoGroup>();
         
         // If holding a hammer, can manipulate the tunne;
         if (playerIsHoldingHammer()) {
            highlightInfoArray.push(
               [{
                  width: 16,
                  height: 64,
                  isCircle: false,
                  xOffset: -24,
                  yOffset: 0,
                  rotation: 0,
                  group: 0
               },
               {
                  width: 16,
                  height: 64,
                  isCircle: false,
                  xOffset: 24,
                  yOffset: 0,
                  rotation: 0,
                  group: 0
               }]
            );
         }

         // @Incomplete: the positions of these highlights are a bit incorrect
         const tunnelComponent = entity.getServerComponent(ServerComponentType.tunnel);
         if (tunnelComponent.hasTopDoor()) {
            const doorInfo = getTunnelDoorInfo(0b01, tunnelComponent.topDoorOpenProgress);
            highlightInfoArray.push([{
               width: 48,
               height: 16,
               isCircle: false,
               xOffset: doorInfo.offsetX - 2 * Math.sin(doorInfo.rotation + entity.rotation),
               yOffset: doorInfo.offsetY - 2 * Math.sin(doorInfo.rotation + entity.rotation),
               rotation: doorInfo.rotation,
               group: 1
            }]);
         }
         if (tunnelComponent.hasBottomDoor()) {
            const doorInfo = getTunnelDoorInfo(0b10, tunnelComponent.bottomDoorOpenProgress);
            highlightInfoArray.push([{
               width: 48,
               height: 16,
               isCircle: false,
               xOffset: doorInfo.offsetX - 2 * Math.sin(doorInfo.rotation + entity.rotation),
               yOffset: doorInfo.offsetY - 2 * Math.sin(doorInfo.rotation + entity.rotation),
               rotation: doorInfo.rotation,
               group: 2
            }]);
         }
            
         return highlightInfoArray;
      }
      case EntityType.embrasure: return [
         [{
            width: 64,
            height: 20,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }],
      ];
      case EntityType.floorSpikes: return [
         [{
            width: 56,
            height: 56,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }],
      ];
      case EntityType.wallSpikes: return [
         [{
            width: 68,
            height: 28,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }],
      ];
      case EntityType.floorPunjiSticks: return [
         [{
            width: 56,
            height: 56,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }],
      ];
      case EntityType.wallPunjiSticks: return [
         [{
            width: 68,
            height: 32,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }],
      ];
      case EntityType.slingTurret: return [
         [{
            width: 64,
            height: 64,
            isCircle: true,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }],
      ];
      case EntityType.workerHut: return [
         [{
            width: 88,
            height: 88,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.warriorHut: return [
         [{
            width: 104,
            height: 104,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.planterBox: return [
         [{
            width: 80,
            height: 80,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.fence: return [
         [{
            width: 24,
            height: 24,
            isCircle: false,
            xOffset: 0,
            yOffset: 0,
            rotation: 0,
            group: 0
         }]
      ];
      case EntityType.fenceGate: {
         const fenceGateComponent = entity.getServerComponent(ServerComponentType.fenceGate);
         const doorInfo = getFenceGateDoorInfo(fenceGateComponent.openProgress);
         return [
            [{
               width: 52,
               height: 16,
               isCircle: false,
               // @Hack
               xOffset: doorInfo.offsetX - 2 * Math.sin(doorInfo.rotation + entity.rotation),
               yOffset: doorInfo.offsetY - 2 * Math.sin(doorInfo.rotation + entity.rotation),
               rotation: doorInfo.rotation,
               group: 0
            }]
         ];
      }
   }

   throw new Error("No highlight info for entity type " + EntityTypeString[entity.type]);
}

export function getClosestGroupNum(entity: Entity): number {
   const groups = getEntityHighlightInfoArray(entity);
   
   let minCursorDist = Number.MAX_SAFE_INTEGER;
   let closestGroupNum = 0;
   
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      for (let j = 0; j < group.length; j++) {
         const highlightInfo = group[j];

         const x = entity.position.x + rotateXAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
         const y = entity.position.y + rotateYAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
         const dist = distance(Game.cursorPositionX!, Game.cursorPositionY!, x, y);
         if (dist < minCursorDist) {
            minCursorDist = dist;
            closestGroupNum = highlightInfo.group;
         }
      }
   }

   return closestGroupNum;
}

const getHighlightInfoGroup = (entity: Entity): HighlightInfoGroup => {
   const groupNum = getClosestGroupNum(entity);
   const highlightInfoArray = getEntityHighlightInfoArray(entity);
   for (let i = 0; i < highlightInfoArray.length; i++) {
      const group = highlightInfoArray[i];
      if (group[0].group === groupNum) {
         return group;
      }
   }
   throw new Error();
}

let program: WebGLProgram;

let originPositionUniformLocation: WebGLUniformLocation;
let isSelectedUniformLocation: WebGLUniformLocation;

export function createStructureHighlightShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;

   out vec2 v_position;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0); 

      v_position = a_position;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Time {
      uniform float u_time;
   };

   uniform vec2 u_originPosition;
   uniform float u_isSelected;

   #define PI 3.14159
   
   in vec2 v_position;
   
   out vec4 outputColour;

   float atan2(in float y, in float x) {
      bool s = (abs(x) > abs(y));
      return mix(PI/2.0 - atan(x,y), atan(y,x), s);
   }
   
   void main() {
      if (u_isSelected > 0.5) {
         outputColour = vec4(245.0/255.0, 234.0/255.0, 113.0/255.0, 1.0);
      } else {
         float theta = atan2(v_position.y - u_originPosition.y, v_position.x - u_originPosition.x);
   
         float opacity = sin(theta * 3.0 + u_time * 0.003);
         opacity = mix(0.65, 1.0, opacity);
   
         outputColour = vec4(245.0/255.0, 234.0/255.0, 113.0/255.0, opacity);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const highlightsTimeBlockIndex = gl.getUniformBlockIndex(program, "Time");
   gl.uniformBlockBinding(program, highlightsTimeBlockIndex, TIME_UNIFORM_BUFFER_BINDING_INDEX);

   originPositionUniformLocation = gl.getUniformLocation(program, "u_originPosition")!;
   isSelectedUniformLocation = gl.getUniformLocation(program, "u_isSelected")!;
}

const addSideVertices = (vertices: Array<number>, centerX: number, centerY: number, x1: number, x2: number, y1: number, y2: number, rotation: number): void => {
   const tlX = rotateXAroundPoint(x1, y2, centerX, centerY, rotation);
   const tlY = rotateYAroundPoint(x1, y2, centerX, centerY, rotation);
   const trX = rotateXAroundPoint(x2, y2, centerX, centerY, rotation);
   const trY = rotateYAroundPoint(x2, y2, centerX, centerY, rotation);
   const blX = rotateXAroundPoint(x1, y1, centerX, centerY, rotation);
   const blY = rotateYAroundPoint(x1, y1, centerX, centerY, rotation);
   const brX = rotateXAroundPoint(x2, y1, centerX, centerY, rotation);
   const brY = rotateYAroundPoint(x2, y1, centerX, centerY, rotation);

   vertices.push(
      blX, blY,
      brX, brY,
      tlX, tlY,
      tlX, tlY,
      brX, brY,
      trX, trY
   );
}

const calculateVertices = (entity: Entity): ReadonlyArray<number> => {
   const highlightInfoGroup = getHighlightInfoGroup(entity);
   
   const vertices = new Array<number>();
   for (let i = 0; i < highlightInfoGroup.length; i++) {
      const highlightInfo = highlightInfoGroup[i];

      if (highlightInfo.isCircle) {
         const radius = highlightInfo.width / 2;
      
         const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;
         
         // Add the outer vertices
         for (let i = 0; i < CIRCLE_VERTEX_COUNT; i++) {
            const radians = i * 2 * Math.PI / CIRCLE_VERTEX_COUNT;
            // @Speed: Garbage collection
            
            // Trig shenanigans to get x and y coords
            const bl = Point.fromVectorForm(radius, radians);
            const br = Point.fromVectorForm(radius, radians + step);
            const tl = Point.fromVectorForm(radius + THICKNESS, radians);
            const tr = Point.fromVectorForm(radius + THICKNESS, radians + step);
      
            bl.add(entity.position);
            br.add(entity.position);
            tl.add(entity.position);
            tr.add(entity.position);
      
            vertices.push(
               bl.x, bl.y,
               br.x, br.y,
               tl.x, tl.y,
               tl.x, tl.y,
               br.x, br.y,
               tr.x, tr.y
            );
         }
      } else {
         const halfWidth = highlightInfo.width / 2;
         const halfHeight = highlightInfo.height / 2;
      
         const x = entity.position.x + rotateXAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
         const y = entity.position.y + rotateYAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
      
         const rotation = entity.rotation + highlightInfo.rotation;
         
         // Top
         addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x + halfWidth + THICKNESS, y + halfHeight, y + halfHeight + THICKNESS, rotation);
         // Right
         addSideVertices(vertices, x, y, x + halfWidth, x + halfWidth + THICKNESS, y - halfHeight - THICKNESS, y + halfHeight + THICKNESS, rotation);
         // Bottom
         addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x + halfWidth + THICKNESS, y - halfHeight, y - halfHeight - THICKNESS, rotation);
         // Left
         addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x - halfWidth, y - halfHeight - THICKNESS, y + halfHeight + THICKNESS, rotation);
      }
   }

   return vertices;
}

export function renderStructureHighlights(): void {
   const highlightedStructureID = getHighlightedEntityID();
   const highlightedEntity = Board.entityRecord[highlightedStructureID];
   if (typeof highlightedEntity === "undefined") {
      return;
   }

   const vertices = calculateVertices(highlightedEntity);
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.uniform2f(originPositionUniformLocation, highlightedEntity.position.x, highlightedEntity.position.y);

   gl.uniform1f(isSelectedUniformLocation, highlightedStructureID === getSelectedEntityID() ? 1 : 0);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}