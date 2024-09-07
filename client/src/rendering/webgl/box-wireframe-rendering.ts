import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { createWebGLProgram, gl } from "../../webgl";
import Entity from "../../Entity";
import Board from "../../Board";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Box, boxIsCircular, HitboxCollisionType } from "webgl-test-shared/dist/boxes/boxes";
import { DamageBoxComponentArray } from "../../entity-components/DamageBoxComponent";
import { TransformComponentArray } from "../../entity-components/TransformComponent";
import { EntityID } from "webgl-test-shared/dist/entities";

const BORDER_THICKNESS = 3;
const HALF_BORDER_THICKNESS = BORDER_THICKNESS / 2;
const CIRCLE_VERTEX_COUNT = 20;

let program: WebGLProgram;
let buffer: WebGLBuffer;

export function createHitboxShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec3 a_colour;

   out vec3 v_colour;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_colour = a_colour;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   in vec3 v_colour;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(v_colour, 1.0);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);

   buffer = gl.createBuffer()!;
}

const calculateBoxAdjustment = (entityID: EntityID): Point => {
   const entity = Board.entityRecord[entityID]!;
   const transformComponent = TransformComponentArray.getComponent(entityID);

   const adjustment = entity.renderPosition.copy();
   adjustment.x -= transformComponent.position.x;
   adjustment.y -= transformComponent.position.y;
   return adjustment;
}

const addBoxVertices = (vertices: Array<number>, box: Box, adjustment: Point, r: number, g: number, b: number): void => {
   // Interpolate the hitbox render position
   const hitboxRenderPositionX = box.position.x + adjustment.x;
   const hitboxRenderPositionY = box.position.y + adjustment.y;

   if (!boxIsCircular(box)) {
      // Rectangular
      
      const rotation = box.rotation;
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      // Top
      {
         const tlX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const tlY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const trX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const trY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const blX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);
         const blY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);
         const brX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);
         const brY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);

         vertices.push(
            blX, blY, r, g, b,
            brX, brY, r, g, b,
            tlX, tlY, r, g, b,
            tlX, tlY, r, g, b,
            brX, brY, r, g, b,
            trX, trY, r, g, b
         );
      }
      
      // Right
      {
         const tlX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);
         const tlY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);
         const trX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const trY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const blX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);
         const blY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);
         const brX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);
         const brY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);

         vertices.push(
            blX, blY, r, g, b,
            brX, brY, r, g, b,
            tlX, tlY, r, g, b,
            tlX, tlY, r, g, b,
            brX, brY, r, g, b,
            trX, trY, r, g, b
         );
      }
      
      // Bottom
      {
         const tlX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);
         const tlY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);
         const trX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);
         const trY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);
         const blX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);
         const blY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);
         const brX = hitboxRenderPositionX + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);
         const brY = hitboxRenderPositionY + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);

         vertices.push(
            blX, blY, r, g, b,
            brX, brY, r, g, b,
            tlX, tlY, r, g, b,
            tlX, tlY, r, g, b,
            brX, brY, r, g, b,
            trX, trY, r, g, b
         );
      }
      
      // Left
      {
         const tlX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const tlY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, rotation);
         const trX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);
         const trY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, rotation);
         const blX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);
         const blY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, rotation);
         const brX = hitboxRenderPositionX + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);
         const brY = hitboxRenderPositionY + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, rotation);

         vertices.push(
            blX, blY, r, g, b,
            brX, brY, r, g, b,
            tlX, tlY, r, g, b,
            tlX, tlY, r, g, b,
            brX, brY, r, g, b,
            trX, trY, r, g, b
         );
      }
   } else {
      // Circular

      const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;

      for (let i = 0; i < CIRCLE_VERTEX_COUNT; i++) {
         const radians = i * 2 * Math.PI / CIRCLE_VERTEX_COUNT;
         // @Speed: Garbage collection
         
         const radius = box.radius;
         const bl = Point.fromVectorForm(radius, radians);
         const br = Point.fromVectorForm(radius, radians + step);
         const tl = Point.fromVectorForm(radius + BORDER_THICKNESS, radians);
         const tr = Point.fromVectorForm(radius + BORDER_THICKNESS, radians + step);
   
         bl.x += hitboxRenderPositionX;
         bl.y += hitboxRenderPositionY;
         br.x += hitboxRenderPositionX;
         br.y += hitboxRenderPositionY;
         tl.x += hitboxRenderPositionX;
         tl.y += hitboxRenderPositionY;
         tr.x += hitboxRenderPositionX;
         tr.y += hitboxRenderPositionY;
   
         vertices.push(
            bl.x, bl.y, r, g, b,
            br.x, br.y, r, g, b,
            tl.x, tl.y, r, g, b,
            tl.x, tl.y, r, g, b,
            br.x, br.y, r, g, b,
            tr.x, tr.y, r, g, b
         );
      }
   }
}

const renderVertices = (vertices: Array<number>): void => {
   gl.useProgram(program);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
}

export function renderHitboxes(): void {
   const vertices = new Array<number>();
   
   for (const entity of Board.entities) {
      const transformComponent = entity.getServerComponent(ServerComponentType.transform);
      
      const adjustment = calculateBoxAdjustment(entity.id);

      for (const hitbox of transformComponent.hitboxes) {
         let r: number;
         let g: number;
         let b: number;
         if (hitbox.collisionType === HitboxCollisionType.hard) {
            r = 1;
            g = 0;
            b = 0;
         } else {
            r = 0;
            g = 1;
            b = 0;
         }
         
         const box = hitbox.box;
         addBoxVertices(vertices, box, adjustment, r, g, b);
      }
   }

   renderVertices(vertices);
}

export function renderDamageBoxes(): void {
   const vertices = new Array<number>();

   for (let i = 0; i < DamageBoxComponentArray.components.length; i++) {
      const damageBoxComponent = DamageBoxComponentArray.components[i];
      const entityID = DamageBoxComponentArray.entities[i];

      const adjustment = calculateBoxAdjustment(entityID);

      for (let j = 0; j < damageBoxComponent.damageBoxes.length; j++) {
         const damageBox = damageBoxComponent.damageBoxes[j];
         addBoxVertices(vertices, damageBox.box, adjustment, 1, 0.6, 0);
      }
   }

   renderVertices(vertices);
}