import { createWebGLProgram, gl } from "../../webgl";
import { Settings } from "battletribes-shared/settings";
import { angle, distance, rotateXAroundPoint, rotateYAroundPoint } from "battletribes-shared/utils";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { HealingTotemComponentArray } from "../../entity-components/server-components/HealingTotemComponent";
import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { entityExists } from "../../world";
import { Hitbox } from "../../hitboxes";

export const HEALING_BEAM_THICKNESS = 32;

let program: WebGLProgram;
let vertexBuffer: WebGLBuffer;
let vao: WebGLVertexArrayObject;

export function createHealingBeamShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_beamStartPosition;
   layout(location = 2) in vec2 a_beamDirection;
   layout(location = 3) in float a_ticksHealed;

   out vec2 v_position;
   out vec2 v_beamStartPosition;
   out vec2 v_beamDirection;
   out float v_ticksHealed;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_position = a_position;
      v_beamStartPosition = a_beamStartPosition;
      v_beamDirection = a_beamDirection;
      v_ticksHealed = a_ticksHealed;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   #define BEAM_THICKNESS ${HEALING_BEAM_THICKNESS.toFixed(1)}
   #define TPS ${Settings.TICK_RATE.toFixed(1)}

   #define INNER_COLOUR vec4(15.0/255.0, 252.0/255.0, 3.0/255.0, 0.8)
   #define OUTER_COLOUR vec4(10.0/255.0, 199.0/255.0, 54.0/255.0, 0.0)

   #define INNER_FLASH_COLOUR vec4(196.0/255.0, 255.0/255.0, 210.0/255.0, 0.8)
   #define OUTER_FLASH_COLOUR vec4(15.0/255.0, 252.0/255.0, 3.0/255.0, 0.0)

   in vec2 v_position;
   in vec2 v_beamStartPosition;
   in vec2 v_beamDirection;
   in float v_ticksHealed;

   out vec4 outputColour;

   float getSecondsSinceLastHeal(float ticksHealed) {
      if (ticksHealed < TPS) {
         return 1.0;
      } else {
         return fract(ticksHealed / TPS);
      }
   }

   void main() {
      vec2 perpBeamDirection = v_beamDirection;
      vec2 offsetFromStart = v_position - v_beamStartPosition;

      float distFromCenter = abs(dot(offsetFromStart, perpBeamDirection));

      float amountIn = distFromCenter / (BEAM_THICKNESS * 0.5);
      amountIn = amountIn * amountIn;
      amountIn = 1.0 - amountIn;

      float secondsSinceLastHeal = getSecondsSinceLastHeal(v_ticksHealed);

      vec4 innerColour = mix(INNER_FLASH_COLOUR, INNER_COLOUR, secondsSinceLastHeal);
      vec4 outerColour = mix(OUTER_FLASH_COLOUR, OUTER_COLOUR, secondsSinceLastHeal);
      
      outputColour = mix(outerColour, innerColour, amountIn);

      float opacity = (v_ticksHealed * 1.75) / TPS;
      if (opacity > 1.0) {
         opacity = 1.0;
      }
      outputColour.a *= opacity;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);
   
   vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.bindVertexArray(null);
}

interface HealingBeam {
   readonly startX: number;
   readonly startY: number;
   readonly endX: number;
   readonly endY: number;
   readonly entityID: number;
   readonly ticksHealed: number;
}

const getVisibleHealingBeams = (): ReadonlyArray<HealingBeam> => {
   const beams = new Array<HealingBeam>();
   
   const entities = HealingTotemComponentArray.entities;
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const healingTotemComponent = HealingTotemComponentArray.components[i];

      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      for (let i = 0; i < healingTotemComponent.healingTargetsData.length; i++) {
         const healingTargetData = healingTotemComponent.healingTargetsData[i];
         beams.push({
            startX: hitbox.box.position.x,
            startY: hitbox.box.position.y,
            endX: healingTargetData.x,
            endY: healingTargetData.y,
            entityID: healingTargetData.entityID,
            ticksHealed: healingTargetData.ticksHealed
         });
      }
   }

   return beams;
}

const createData = (visibleBeams: ReadonlyArray<HealingBeam>): ReadonlyArray<number> => {
   const vertices = new Array<number>();

   for (let i = 0; i < visibleBeams.length; i++) {
      const beam = visibleBeams[i];

      let endX: number;
      let endY: number;
      if (entityExists(beam.entityID)) {
         const transformComponent = TransformComponentArray.getComponent(beam.entityID)
         const hitbox = transformComponent.hitboxes[0];
         endX = hitbox.box.position.x;
         endY = hitbox.box.position.y;
      } else {
         endX = beam.endX;
         endY = beam.endY;
      }

      const centerX = (beam.startX + endX) * 0.5;
      const centerY = (beam.startY + endY) * 0.5;

      const beamDirection = angle(endX - beam.startX, endY - beam.startY);
      const beamLength = distance(beam.startX, beam.startY, endX, endY);

      const x1 = centerX - HEALING_BEAM_THICKNESS * 0.5;
      const x2 = centerX + HEALING_BEAM_THICKNESS * 0.5;
      const y1 = centerY - beamLength * 0.5;
      const y2 = centerY + beamLength * 0.5;

      const tlX = rotateXAroundPoint(x1, y2, centerX, centerY, beamDirection);
      const tlY = rotateYAroundPoint(x1, y2, centerX, centerY, beamDirection);
      const trX = rotateXAroundPoint(x2, y2, centerX, centerY, beamDirection);
      const trY = rotateYAroundPoint(x2, y2, centerX, centerY, beamDirection);
      const blX = rotateXAroundPoint(x1, y1, centerX, centerY, beamDirection);
      const blY = rotateYAroundPoint(x1, y1, centerX, centerY, beamDirection);
      const brX = rotateXAroundPoint(x2, y1, centerX, centerY, beamDirection);
      const brY = rotateYAroundPoint(x2, y1, centerX, centerY, beamDirection);
   
      const beamProjX = Math.sin(beamDirection + Math.PI/2);
      const beamProjY = Math.cos(beamDirection + Math.PI/2);

      vertices.push(
         blX, blY, beam.startX, beam.startY, beamProjX, beamProjY, beam.ticksHealed,
         brX, brY, beam.startX, beam.startY, beamProjX, beamProjY, beam.ticksHealed,
         tlX, tlY, beam.startX, beam.startY, beamProjX, beamProjY, beam.ticksHealed,
         tlX, tlY, beam.startX, beam.startY, beamProjX, beamProjY, beam.ticksHealed,
         brX, brY, beam.startX, beam.startY, beamProjX, beamProjY, beam.ticksHealed,
         trX, trY, beam.startX, beam.startY, beamProjX, beamProjY, beam.ticksHealed
      );
   }

   return vertices;
}

export function renderHealingBeams(): void {
   const visibleBeams = getVisibleHealingBeams();
   const vertices = createData(visibleBeams);
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   gl.bindVertexArray(vao);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 7);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}