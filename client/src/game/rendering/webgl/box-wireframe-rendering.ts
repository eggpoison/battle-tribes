import { Point, polarVec2, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { CollisionGroup, getEntityCollisionGroup } from "battletribes-shared/collision-groups";
import { createWebGLProgram, gl } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { Box, boxIsCircular, getRelativePivotPos, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { Entity } from "battletribes-shared/entities";
import { getEntityLayer, getEntityType } from "../../world";
import Layer from "../../Layer";

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

const calculateBoxAdjustment = (entity: Entity): Point => {
   return new Point(0, 0);
   // @INCOMPLETE
   // const transformComponent = TransformComponentArray.getComponent(entity);
   // const renderInfo = getEntityRenderInfo(entity);

   // const adjustment = renderInfo.renderPosition.copy();
   // adjustment.x -= transformComponent.position.x;
   // adjustment.y -= transformComponent.position.y;
   // return adjustment;
}

const addRectVertices = (vertices: Array<number>, x: number, y: number, width: number, height: number, angle: number, r: number, g: number, b: number) => {
   const halfWidth = width / 2;
   const halfHeight = height / 2;
   
   // Top
   {
      const tlX = x + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const tlY = y + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const trX = x + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const trY = y + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const blX = x + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);
      const blY = y + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);
      const brX = x + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);
      const brY = y + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);

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
      const tlX = x + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);
      const tlY = y + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);
      const trX = x + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const trY = y + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const blX = x + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);
      const blY = y + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);
      const brX = x + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);
      const brY = y + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);

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
      const tlX = x + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);
      const tlY = y + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);
      const trX = x + rotateXAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);
      const trY = y + rotateYAroundOrigin(halfWidth - HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);
      const blX = x + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);
      const blY = y + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);
      const brX = x + rotateXAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);
      const brY = y + rotateYAroundOrigin(halfWidth + HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);

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
      const tlX = x + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const tlY = y + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, halfHeight + HALF_BORDER_THICKNESS, angle);
      const trX = x + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);
      const trY = y + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, halfHeight - HALF_BORDER_THICKNESS, angle);
      const blX = x + rotateXAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);
      const blY = y + rotateYAroundOrigin(-halfWidth - HALF_BORDER_THICKNESS, -halfHeight - HALF_BORDER_THICKNESS, angle);
      const brX = x + rotateXAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);
      const brY = y + rotateYAroundOrigin(-halfWidth + HALF_BORDER_THICKNESS, -halfHeight + HALF_BORDER_THICKNESS, angle);

      vertices.push(
         blX, blY, r, g, b,
         brX, brY, r, g, b,
         tlX, tlY, r, g, b,
         tlX, tlY, r, g, b,
         brX, brY, r, g, b,
         trX, trY, r, g, b
      );
   }
}

const addBoxVertices = (vertices: Array<number>, box: Box, adjustment: Point, r: number, g: number, b: number): void => {
   // Interpolate the hitbox render position
   const hitboxRenderPositionX = box.position.x + adjustment.x;
   const hitboxRenderPositionY = box.position.y + adjustment.y;

   if (!boxIsCircular(box)) {
      // Rectangular
      addRectVertices(vertices, hitboxRenderPositionX, hitboxRenderPositionY, box.width * box.scale, box.height * box.scale, box.angle, r, g, b);
   } else {
      // Circular

      const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;
      const radius = box.radius * box.scale;

      for (let i = 0; i < CIRCLE_VERTEX_COUNT; i++) {
         const radians = i * 2 * Math.PI / CIRCLE_VERTEX_COUNT;
         // @Speed: Garbage collection
         
         const bl = polarVec2(radius, radians);
         const br = polarVec2(radius, radians + step);
         const tl = polarVec2(radius + BORDER_THICKNESS, radians);
         const tr = polarVec2(radius + BORDER_THICKNESS, radians + step);
   
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

export function renderHitboxes(layer: Layer): void {
   const vertices = new Array<number>();
   
   for (let i = 0; i < TransformComponentArray.entities.length; i++) {
      const entity = TransformComponentArray.entities[i];

      // Don't show hitboxes from other layers
      const entityLayer = getEntityLayer(entity);
      if (entityLayer !== layer) {
         continue;
      }

      const entityType = getEntityType(entity);
      const collisionGroup = getEntityCollisionGroup(entityType);
      if (collisionGroup === CollisionGroup.decoration) {
         continue;
      }
      
      const transformComponent = TransformComponentArray.components[i];
      
      const adjustment = calculateBoxAdjustment(entity);

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

         // note: position is already pivoted so we don't have to add the rotated relative pivot
         const unrotatedRelativePivotPos = getRelativePivotPos(box, box.angle);
         const pivotPointX = box.position.x + unrotatedRelativePivotPos.x;
         const pivotPointY = box.position.y + unrotatedRelativePivotPos.y;
         addRectVertices(vertices, pivotPointX, pivotPointY, 4, 4, 0, 0, 0, 1);
      }
   }

   renderVertices(vertices);
}