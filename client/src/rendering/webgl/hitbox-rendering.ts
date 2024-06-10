import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { createWebGLProgram, gl } from "../../webgl";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import Entity from "../../Entity";
import Board from "../../Board";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

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
   layout(location = 1) in float a_hasHardCollision;

   out float v_hasHardCollision;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0); 

      v_hasHardCollision = a_hasHardCollision;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   #define HARD_BORDER vec4(1.0, 0.0, 0.0, 1.0)
   #define SOFT_BORDER vec4(0.0, 1.0, 0.0, 1.0)
   
   in float v_hasHardCollision;
   
   out vec4 outputColour;
   
   void main() {
      if (v_hasHardCollision > 0.5) {
         outputColour = HARD_BORDER;
      } else {
         outputColour = SOFT_BORDER;
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);

   buffer = gl.createBuffer()!;
}

const calculateVisibleEntities = (): Array<Entity> => {
   const visibleEntities = new Array<Entity>();

   for (const entity of Board.entities) {
      visibleEntities.push(entity);
   }

   return visibleEntities;
}

/** Renders all hitboxes of a specified set of entities */
export function renderEntityHitboxes(): void {
   const entities = calculateVisibleEntities();
   if (entities.length === 0) return;

   // @Speed
   // @Speed
   // @Speed

   // Calculate vertices
   const vertices = new Array<number>();
   for (const entity of entities) {
      for (const hitbox of entity.hitboxes) {
         // Interpolate the hitbox render position
         let hitboxRenderPositionX = hitbox.position.x;
         let hitboxRenderPositionY = hitbox.position.y;
         hitboxRenderPositionX += entity.renderPosition.x - entity.position.x;
         hitboxRenderPositionY += entity.renderPosition.y - entity.position.y;

         const hasHardCollision = hitbox.collisionType === HitboxCollisionType.hard ? 1 : 0;
         
         if (hitbox.hasOwnProperty("width")) {
            // Rectangular
            
            const rotation = (hitbox as RectangularHitbox).rotation + entity.rotation;
            const halfWidth = (hitbox as RectangularHitbox).width / 2;
            const halfHeight = (hitbox as RectangularHitbox).height / 2;
            
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
                  blX, blY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  trX, trY, hasHardCollision
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
                  blX, blY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  trX, trY, hasHardCollision
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
                  blX, blY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  trX, trY, hasHardCollision
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
                  blX, blY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  tlX, tlY, hasHardCollision,
                  brX, brY, hasHardCollision,
                  trX, trY, hasHardCollision
               );
            }
         } else {
            // Circular

            const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;

            for (let i = 0; i < CIRCLE_VERTEX_COUNT; i++) {
               const radians = i * 2 * Math.PI / CIRCLE_VERTEX_COUNT;
               // @Speed: Garbage collection
               
               const radius = (hitbox as CircularHitbox).radius;
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
                  bl.x, bl.y, hasHardCollision,
                  br.x, br.y, hasHardCollision,
                  tl.x, tl.y, hasHardCollision,
                  tl.x, tl.y, hasHardCollision,
                  br.x, br.y, hasHardCollision,
                  tr.x, tr.y, hasHardCollision
               );
            }
         }
      }
   }
   
   gl.useProgram(program);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}