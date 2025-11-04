import { lerp } from "battletribes-shared/utils";
import { createWebGLProgram, gl, tempFloat32ArrayLength1, tempFloat32ArrayLength2, tempFloat32ArrayLength3 } from "../../webgl";
import ObjectBufferContainer from "../ObjectBufferContainer";
import { getTexture } from "../../textures";
import Particle from "../../Particle";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";

const OBJECT_BUFFER_CONTAINER_SIZE = 8192;

export type ParticleColour = [r: number, g: number, b: number];
export type ParticleTint = [r: number, g: number, b: number];

export enum ParticleRenderLayer {
   low, // Below game objects
   high // Above game objects
}

export function interpolateColours(startColour: Readonly<ParticleColour>, endColour: Readonly<ParticleColour>, amount: number): ParticleColour {
   return [
      lerp(startColour[0], endColour[0], amount),
      lerp(startColour[1], endColour[1], amount),
      lerp(startColour[2], endColour[2], amount)
   ];
}

let vertPositionBuffer: WebGLBuffer;

export let lowMonocolourBufferContainer: ObjectBufferContainer;
export let highMonocolourBufferContainer: ObjectBufferContainer;
export let lowTexturedBufferContainer: ObjectBufferContainer;
export let highTexturedBufferContainer: ObjectBufferContainer;

let monocolourProgram: WebGLProgram;
let texturedProgram: WebGLProgram;

export function createParticleShaders(): void {
   const monocolourVertexShaderText = `#version 300 es
   precision mediump float;
   
   #define TPS 20.0
   
   layout(std140) uniform Camera {
      vec2 u_playerPos;
      vec2 u_halfWindowSize;
      float u_zoom;
   };
   
   layout(std140) uniform Time {
      uniform float u_time;
   };
   
   layout(location = 0) in vec2 a_vertPosition;
   layout(location = 1) in vec2 a_halfParticleSize;
   layout(location = 2) in vec2 a_position;
   layout(location = 3) in vec2 a_velocity;
   layout(location = 4) in vec2 a_acceleration;
   layout(location = 5) in float a_friction;
   layout(location = 6) in float a_rotation;
   layout(location = 7) in float a_angularVelocity;
   layout(location = 8) in float a_angularAcceleration;
   layout(location = 9) in float a_angularFriction;
   layout(location = 10) in vec3 a_colour;
   layout(location = 11) in float a_opacity;
   layout(location = 12) in float a_scale;
   layout(location = 13) in float a_spawnTime;
   
   out vec2 v_texCoord;
   out vec3 v_colour;
   out float v_opacity;
   
   void main() {
      float age = (u_time - a_spawnTime) / 1000.0;
   
      // Scale the particle to its size
      vec2 position = a_vertPosition * a_halfParticleSize * a_scale;
   
      // Calculate rotation
      float rotation = a_rotation;
      if (a_angularFriction > 0.0) {
         // Calculate the age at which friction meets velocity
         float stopAge = a_angularVelocity / a_angularFriction * sign(a_angularVelocity);
   
         // Apply angular friction and angular velocity
         float unitAngularVelocity = sign(a_angularVelocity);
         if (age < stopAge) {
            rotation += a_angularVelocity * age;
   
            float friction = age * age * a_angularFriction * unitAngularVelocity * 0.5;
            rotation -= friction;
         } else {
            rotation += a_angularVelocity * stopAge - stopAge * stopAge * a_angularFriction * unitAngularVelocity * 0.5;
         }
      } else {
         // Account for velocity and acceleration
         rotation += a_angularVelocity * age + a_angularAcceleration * age * age * 0.5;
      }
      
      // Rotate
      float cosRotation = cos(rotation);
      float sinRotation = sin(rotation);
      float x = cosRotation * position.x + sinRotation * position.y;
      float y = -sinRotation * position.x + cosRotation * position.y;
      position.x = x;
      position.y = y;
      
      // Translate to the particle's position
      position += a_position;
   
      if (a_friction > 0.0) {
         // Calculate the age at which friction meets velocity
         float stopAge = a_velocity.x / a_friction * sign(a_velocity.x);
   
         // Apply friction and velocity
         vec2 unitVelocity = normalize(a_velocity);
         if (age < stopAge) {
            position += a_velocity * age;
   
            vec2 friction = age * age * a_friction * unitVelocity * 0.5;
            position -= friction;
         } else {
            position += a_velocity * stopAge - stopAge * stopAge * a_friction * unitVelocity * 0.5;
         }
      } else {
         position += a_velocity * age + a_acceleration * age * age * 0.5;
      }
      
      // Calculate position in canvas
      vec2 screenPos = (position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_colour = a_colour;
      v_opacity = a_opacity;
   }
   `;
   
   const monocolourFragmentShaderText = `#version 300 es
   precision mediump float;
   
   in vec3 v_colour;
   in float v_opacity;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(v_colour, v_opacity);
      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;
   
   const texturedVertexShaderText = `#version 300 es
   precision mediump float;
   
   #define TPS 20.0
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(std140) uniform Time {
      uniform float u_time;
   };
   
   layout(location = 0) in vec2 a_vertPosition;
   layout(location = 1) in vec2 a_halfParticleSize;
   layout(location = 2) in vec2 a_position;
   layout(location = 3) in vec2 a_velocity;
   layout(location = 4) in vec2 a_acceleration;
   layout(location = 5) in float a_friction;
   layout(location = 6) in float a_rotation;
   layout(location = 7) in float a_angularVelocity;
   layout(location = 8) in float a_angularAcceleration;
   layout(location = 9) in float a_angularFriction;
   layout(location = 10) in vec3 a_tint;
   layout(location = 11) in float a_opacity;
   layout(location = 12) in float a_scale;
   layout(location = 13) in float a_spawnTime;
   layout(location = 14) in float a_textureIndex;
   
   out vec2 v_texCoord;
   out vec3 v_tint;
   out float v_opacity;
   out float v_textureIndex;
   
   void main() {
      float age = (u_time - a_spawnTime) / 1000.0;
   
      // Scale the particle to its size
      vec2 position = a_vertPosition * a_halfParticleSize * a_scale;
   
      // Calculate rotation
      float rotation = a_rotation;
      if (a_angularFriction > 0.0) {
         // Calculate the age at which friction meets velocity
         float stopAge = a_angularVelocity / a_angularFriction * sign(a_angularVelocity);
   
         // Apply angular friction and angular velocity
         float unitAngularVelocity = sign(a_angularVelocity);
         if (age < stopAge) {
            rotation += a_angularVelocity * age;
   
            float friction = age * age * a_angularFriction * unitAngularVelocity * 0.5;
            rotation -= friction;
         } else {
            rotation += a_angularVelocity * stopAge - stopAge * stopAge * a_angularFriction * unitAngularVelocity * 0.5;
         }
      } else {
         // Account for velocity and acceleration
         rotation += a_angularVelocity * age + a_angularAcceleration * age * age * 0.5;
      }
   
      // Rotate
      float cosRotation = cos(rotation);
      float sinRotation = sin(rotation);
      float x = cosRotation * position.x + sinRotation * position.y;
      float y = -sinRotation * position.x + cosRotation * position.y;
      position.x = x;
      position.y = y;
      
      // Translate to the particle's position
      position += a_position;
   
      if (a_friction > 0.0) {
         // Calculate the age at which friction meets velocity
         float stopAge = a_velocity.x / a_friction * sign(a_velocity.x);
   
         // Apply friction and velocity
         vec2 unitVelocity = normalize(a_velocity);
         if (age < stopAge) {
            position += a_velocity * age;
   
            vec2 friction = age * age * a_friction * unitVelocity * 0.5;
            position -= friction;
         } else {
            position += a_velocity * stopAge - stopAge * stopAge * a_friction * unitVelocity * 0.5;
         }
      } else {
         // Account for velocity and acceleration
         position += a_velocity * age + a_acceleration * age * age * 0.5;
      }
      
      // Calculate position in canvas
      vec2 screenPos = (position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = (a_vertPosition + 1.0) / 2.0; // Convert from vert position to texture coordinates
      v_tint = a_tint;
      v_opacity = a_opacity;
      v_textureIndex = a_textureIndex;
   }
   `;
   
   const texturedFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define TEXTURE_ATLAS_SIZE 8.0
   
   uniform sampler2D u_textureAtlas;
   
   in vec2 v_texCoord;
   in float v_opacity;
   in vec3 v_tint;
   in float v_textureIndex;
   
   out vec4 outputColour;
   
   void main() {
      float textureXIndex = mod(v_textureIndex, TEXTURE_ATLAS_SIZE);
      float textureYIndex = floor(v_textureIndex / TEXTURE_ATLAS_SIZE);
   
      float texCoordX = (textureXIndex + v_texCoord.x) / TEXTURE_ATLAS_SIZE;
      float texCoordY = 1.0 - ((textureYIndex + v_texCoord.y) / TEXTURE_ATLAS_SIZE);
   
      outputColour = texture(u_textureAtlas, vec2(texCoordX, texCoordY));
      
      if (v_tint.r > 0.0) {
         outputColour.r = mix(outputColour.r, 1.0, v_tint.r);
      } else {
         outputColour.r = mix(outputColour.r, 0.0, -v_tint.r);
      }
      if (v_tint.g > 0.0) {
         outputColour.g = mix(outputColour.g, 1.0, v_tint.g);
      } else {
         outputColour.g = mix(outputColour.g, 0.0, -v_tint.g);
      }
      if (v_tint.b > 0.0) {
         outputColour.b = mix(outputColour.b, 1.0, v_tint.b);
      } else {
         outputColour.b = mix(outputColour.b, 0.0, -v_tint.b);
      }
   
      outputColour.a *= v_opacity;
      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   const vertPositionData = new Float32Array(12);
   vertPositionData[0] = -1;
   vertPositionData[1] = -1;
   vertPositionData[2] = 1;
   vertPositionData[3] = -1;
   vertPositionData[4] = -1;
   vertPositionData[5] = 1;
   vertPositionData[6] = -1;
   vertPositionData[7] = 1;
   vertPositionData[8] = 1;
   vertPositionData[9] = -1;
   vertPositionData[10] = 1;
   vertPositionData[11] = 1;

   vertPositionBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertPositionBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertPositionData, gl.STATIC_DRAW);
   
   lowMonocolourBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE);
   highMonocolourBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE);
   for (const bufferContainer of [lowMonocolourBufferContainer, highMonocolourBufferContainer]) {
      bufferContainer.registerNewBufferType(2); // Half particle size
      bufferContainer.registerNewBufferType(2); // Position
      bufferContainer.registerNewBufferType(2); // Velocity
      bufferContainer.registerNewBufferType(2); // Acceleration
      bufferContainer.registerNewBufferType(1); // Friction
      bufferContainer.registerNewBufferType(1); // Rotation
      bufferContainer.registerNewBufferType(1); // Angular velocity
      bufferContainer.registerNewBufferType(1); // Angular acceleration
      bufferContainer.registerNewBufferType(1); // Angular friction
      bufferContainer.registerNewBufferType(3); // Colour
      bufferContainer.registerNewBufferType(1); // Opacity
      bufferContainer.registerNewBufferType(1); // Scale
      bufferContainer.registerNewBufferType(1); // Spawn time
   }

   lowTexturedBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE);
   highTexturedBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE);
   for (const bufferContainer of [lowTexturedBufferContainer, highTexturedBufferContainer]) {
      bufferContainer.registerNewBufferType(2); // Half particle size
      bufferContainer.registerNewBufferType(2); // Position
      bufferContainer.registerNewBufferType(2); // Velocity
      bufferContainer.registerNewBufferType(2); // Acceleration
      bufferContainer.registerNewBufferType(1); // Friction
      bufferContainer.registerNewBufferType(1); // Rotation
      bufferContainer.registerNewBufferType(1); // Angular velocity
      bufferContainer.registerNewBufferType(1); // Angular acceleration
      bufferContainer.registerNewBufferType(1); // Angular friction
      bufferContainer.registerNewBufferType(3); // Tint
      bufferContainer.registerNewBufferType(1); // Opacity
      bufferContainer.registerNewBufferType(1); // Spawn time
      bufferContainer.registerNewBufferType(1); // Scale
      bufferContainer.registerNewBufferType(1); // Texture index
   }

   // 
   // Monocolour program
   // 
   
   monocolourProgram = createWebGLProgram(gl, monocolourVertexShaderText, monocolourFragmentShaderText);
   bindUBOToProgram(gl, monocolourProgram, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, monocolourProgram, UBOBindingIndex.TIME);

   // 
   // Textured program
   // 
   
   texturedProgram = createWebGLProgram(gl, texturedVertexShaderText, texturedFragmentShaderText);
   bindUBOToProgram(gl, texturedProgram, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, texturedProgram, UBOBindingIndex.TIME);
   
   const texturedTextureUniformLocation = gl.getUniformLocation(texturedProgram, "u_texture")!;

   gl.useProgram(texturedProgram);
   gl.uniform1i(texturedTextureUniformLocation, 0);
}

// @Cleanup: a bunch of the code in these functions are the same

export function addMonocolourParticleToBufferContainer(particle: Particle, renderLayer: ParticleRenderLayer, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, friction: number, rotation: number, angularVelocity: number, angularAcceleration: number, angularFriction: number, colourR: number, colourG: number, colourB: number): void {
   // Acceleration and friction can't be both defined at once
   if ((accelerationX !== 0 || accelerationY !== 0) && friction !== 0) {
      throw new Error("Can't define both acceleration and friction");
   }
   if (angularAcceleration && angularFriction !== 0) {
      throw new Error("Can't define both angular acceleration and angular friction");
   }
   if (friction < 0) {
      throw new Error("Friction can't be negative");
   }

   const bufferContainer = renderLayer === ParticleRenderLayer.low ? lowMonocolourBufferContainer : highMonocolourBufferContainer;
   
   bufferContainer.registerNewObject(particle.id);
   
   const opacity = typeof particle.getOpacity !== "undefined" ? particle.getOpacity() : 1;

   // Half size
   tempFloat32ArrayLength2[0] = width / 2;
   tempFloat32ArrayLength2[1] = height / 2;
   bufferContainer.setData(particle.id, 0, tempFloat32ArrayLength2);

   // Position
   tempFloat32ArrayLength2[0] = positionX;
   tempFloat32ArrayLength2[1] = positionY;
   bufferContainer.setData(particle.id, 1, tempFloat32ArrayLength2);

   // Velocity
   tempFloat32ArrayLength2[0] = velocityX;
   tempFloat32ArrayLength2[1] = velocityY;
   bufferContainer.setData(particle.id, 2, tempFloat32ArrayLength2);

   // Acceleration
   tempFloat32ArrayLength2[0] = accelerationX;
   tempFloat32ArrayLength2[1] = accelerationY;
   bufferContainer.setData(particle.id, 3, tempFloat32ArrayLength2);

   // Friction
   tempFloat32ArrayLength1[0] = friction;
   bufferContainer.setData(particle.id, 4, tempFloat32ArrayLength1);

   // Rotation
   tempFloat32ArrayLength1[0] = rotation;
   bufferContainer.setData(particle.id, 5, tempFloat32ArrayLength1);

   // Angular velocity
   tempFloat32ArrayLength1[0] = angularVelocity;
   bufferContainer.setData(particle.id, 6, tempFloat32ArrayLength1);

   // Angular acceleration
   tempFloat32ArrayLength1[0] = angularAcceleration;
   bufferContainer.setData(particle.id, 7, tempFloat32ArrayLength1);

   // Angular friction
   tempFloat32ArrayLength1[0] = angularFriction;
   bufferContainer.setData(particle.id, 8, tempFloat32ArrayLength1);

   // Colour
   tempFloat32ArrayLength3[0] = colourR;
   tempFloat32ArrayLength3[1] = colourG;
   tempFloat32ArrayLength3[2] = colourB;
   bufferContainer.setData(particle.id, 9, tempFloat32ArrayLength3);

   // Opacity
   tempFloat32ArrayLength1[0] = opacity;
   bufferContainer.setData(particle.id, 10, tempFloat32ArrayLength1);

   // Scale
   tempFloat32ArrayLength1[0] = 1;
   bufferContainer.setData(particle.id, 11, tempFloat32ArrayLength1);

   // Spawn time
   tempFloat32ArrayLength1[0] = performance.now();
   bufferContainer.setData(particle.id, 12, tempFloat32ArrayLength1);
}

export function addTexturedParticleToBufferContainer(particle: Particle, renderLayer: ParticleRenderLayer, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, friction: number, rotation: number, angularVelocity: number, angularAcceleration: number, angularFriction: number, textureIndex: number, tintR: number, tintG: number, tintB: number): void {
   const bufferContainer = renderLayer === ParticleRenderLayer.low ? lowTexturedBufferContainer : highTexturedBufferContainer;
   
   bufferContainer.registerNewObject(particle.id);
   
   const opacity = typeof particle.getOpacity !== "undefined" ? particle.getOpacity() : 1;

   // Half size
   tempFloat32ArrayLength2[0] = width / 2;
   tempFloat32ArrayLength2[1] = height / 2;
   bufferContainer.setData(particle.id, 0, tempFloat32ArrayLength2);

   // Position
   tempFloat32ArrayLength2[0] = positionX;
   tempFloat32ArrayLength2[1] = positionY;
   bufferContainer.setData(particle.id, 1, tempFloat32ArrayLength2);

   // Velocity
   tempFloat32ArrayLength2[0] = velocityX;
   tempFloat32ArrayLength2[1] = velocityY;
   bufferContainer.setData(particle.id, 2, tempFloat32ArrayLength2);

   // Acceleration
   tempFloat32ArrayLength2[0] = accelerationX;
   tempFloat32ArrayLength2[1] = accelerationY;
   bufferContainer.setData(particle.id, 3, tempFloat32ArrayLength2);

   // Friction
   tempFloat32ArrayLength1[0] = friction;
   bufferContainer.setData(particle.id, 4, tempFloat32ArrayLength1);

   // Rotation
   tempFloat32ArrayLength1[0] = rotation;
   bufferContainer.setData(particle.id, 5, tempFloat32ArrayLength1);

   // Angular velocity
   tempFloat32ArrayLength1[0] = angularVelocity;
   bufferContainer.setData(particle.id, 6, tempFloat32ArrayLength1);

   // Angular acceleration
   tempFloat32ArrayLength1[0] = angularAcceleration;
   bufferContainer.setData(particle.id, 7, tempFloat32ArrayLength1);

   // Angular friction
   tempFloat32ArrayLength1[0] = angularFriction;
   bufferContainer.setData(particle.id, 8, tempFloat32ArrayLength1);

   // Tint
   tempFloat32ArrayLength3[0] = tintR;
   tempFloat32ArrayLength3[1] = tintG;
   tempFloat32ArrayLength3[2] = tintB;
   bufferContainer.setData(particle.id, 9, tempFloat32ArrayLength3);

   // Opacity
   tempFloat32ArrayLength1[0] = opacity;
   bufferContainer.setData(particle.id, 10, tempFloat32ArrayLength1);

   // Scale
   tempFloat32ArrayLength1[0] = 1;
   bufferContainer.setData(particle.id, 11, tempFloat32ArrayLength1);

   // Current time
   tempFloat32ArrayLength1[0] = performance.now();
   bufferContainer.setData(particle.id, 12, tempFloat32ArrayLength1);

   // Texture index
   tempFloat32ArrayLength1[0] = textureIndex;
   bufferContainer.setData(particle.id, 13, tempFloat32ArrayLength1);
}

export function renderMonocolourParticles(renderLayer: ParticleRenderLayer): void {
   // @Incomplete use VBOs and UBOs

   const bufferContainer = renderLayer === ParticleRenderLayer.low ? lowMonocolourBufferContainer : highMonocolourBufferContainer;
   
   gl.useProgram(monocolourProgram);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   const halfParticleSizeBuffers = bufferContainer.getBuffers(0);
   const positionBuffers = bufferContainer.getBuffers(1);
   const velocityBuffers = bufferContainer.getBuffers(2);
   const accelerationBuffers = bufferContainer.getBuffers(3);
   const frictionBuffers = bufferContainer.getBuffers(4);
   const rotationBuffers = bufferContainer.getBuffers(5);
   const angularVelocityBuffers = bufferContainer.getBuffers(6);
   const angularAccelerationBuffers = bufferContainer.getBuffers(7);
   const angularFrictionBuffers = bufferContainer.getBuffers(8);
   const colourBuffers = bufferContainer.getBuffers(9);
   const opacityBuffers = bufferContainer.getBuffers(10);
   const scaleBuffers = bufferContainer.getBuffers(11);
   const spawnTimeBuffers = bufferContainer.getBuffers(12);

   for (let i = 0; i < bufferContainer.getNumBuffers(); i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertPositionBuffer);
      
      // Vert positions
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      // Particle size
      gl.bindBuffer(gl.ARRAY_BUFFER, halfParticleSizeBuffers[i]);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribDivisor(1, 1);

      // Position
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribDivisor(2, 1);

      // Velocity
      gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
      gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribDivisor(3, 1);

      // Acceleration
      gl.bindBuffer(gl.ARRAY_BUFFER, accelerationBuffers[i]);
      gl.vertexAttribPointer(4, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribDivisor(4, 1);

      // Friction
      gl.bindBuffer(gl.ARRAY_BUFFER, frictionBuffers[i]);
      gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(5);
      gl.vertexAttribDivisor(5, 1);

      // Rotation
      gl.bindBuffer(gl.ARRAY_BUFFER, rotationBuffers[i]);
      gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(6);
      gl.vertexAttribDivisor(6, 1);

      // Angular velocity
      gl.bindBuffer(gl.ARRAY_BUFFER, angularVelocityBuffers[i]);
      gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(7);
      gl.vertexAttribDivisor(7, 1);

      // Angular acceleration
      gl.bindBuffer(gl.ARRAY_BUFFER, angularAccelerationBuffers[i]);
      gl.vertexAttribPointer(8, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(8);
      gl.vertexAttribDivisor(8, 1);

      // Angular friction
      gl.bindBuffer(gl.ARRAY_BUFFER, angularFrictionBuffers[i]);
      gl.vertexAttribPointer(9, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(9);
      gl.vertexAttribDivisor(9, 1);

      // Colour
      gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffers[i]);
      gl.vertexAttribPointer(10, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(10);
      gl.vertexAttribDivisor(10, 1);

      // Opacity
      gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffers[i]);
      gl.vertexAttribPointer(11, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(11);
      gl.vertexAttribDivisor(11, 1);

      // Scale
      gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffers[i]);
      gl.vertexAttribPointer(12, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(12);
      gl.vertexAttribDivisor(12, 1);

      // Spawn time
      gl.bindBuffer(gl.ARRAY_BUFFER, spawnTimeBuffers[i]);
      gl.vertexAttribPointer(13, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(13);
      gl.vertexAttribDivisor(13, 1);
   
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, OBJECT_BUFFER_CONTAINER_SIZE);
   }

   gl.vertexAttribDivisor(1, 0);
   gl.vertexAttribDivisor(2, 0);
   gl.vertexAttribDivisor(3, 0);
   gl.vertexAttribDivisor(4, 0);
   gl.vertexAttribDivisor(5, 0);
   gl.vertexAttribDivisor(6, 0);
   gl.vertexAttribDivisor(7, 0);
   gl.vertexAttribDivisor(8, 0);
   gl.vertexAttribDivisor(9, 0);
   gl.vertexAttribDivisor(10, 0);
   gl.vertexAttribDivisor(11, 0);
   gl.vertexAttribDivisor(12, 0);
   gl.vertexAttribDivisor(13, 0);
   
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function renderTexturedParticles(renderLayer: ParticleRenderLayer): void {
   // @Incomplete use VBOs
   
   gl.useProgram(texturedProgram);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   gl.activeTexture(gl.TEXTURE0);
   const texture = getTexture("miscellaneous/particle-texture-atlas.png");
   gl.bindTexture(gl.TEXTURE_2D, texture);

   const bufferContainer = renderLayer === ParticleRenderLayer.low ? lowTexturedBufferContainer : highTexturedBufferContainer;

   const halfParticleSizeBuffers = bufferContainer.getBuffers(0);
   const positionBuffers = bufferContainer.getBuffers(1);
   const velocityBuffers = bufferContainer.getBuffers(2);
   const accelerationBuffers = bufferContainer.getBuffers(3);
   const frictionBuffers = bufferContainer.getBuffers(4);
   const rotationBuffers = bufferContainer.getBuffers(5);
   const angularVelocityBuffers = bufferContainer.getBuffers(6);
   const angularAccelerationBuffers = bufferContainer.getBuffers(7);
   const angularFrictionBuffers = bufferContainer.getBuffers(8);
   const tintBuffers = bufferContainer.getBuffers(9);
   const opacityBuffers = bufferContainer.getBuffers(10);
   const scaleBuffers = bufferContainer.getBuffers(11);
   const spawnTimeBuffers = bufferContainer.getBuffers(12);
   const textureIndexBuffers = bufferContainer.getBuffers(13);

   for (let i = 0; i < bufferContainer.getNumBuffers(); i++) {
      // Vert positions
      gl.bindBuffer(gl.ARRAY_BUFFER, vertPositionBuffer);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      // Particle size
      gl.bindBuffer(gl.ARRAY_BUFFER, halfParticleSizeBuffers[i]);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribDivisor(1, 1);

      // Position
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribDivisor(2, 1);

      // Velocity
      gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
      gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribDivisor(3, 1);

      // Acceleration
      gl.bindBuffer(gl.ARRAY_BUFFER, accelerationBuffers[i]);
      gl.vertexAttribPointer(4, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribDivisor(4, 1);

      // Friction
      gl.bindBuffer(gl.ARRAY_BUFFER, frictionBuffers[i]);
      gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(5);
      gl.vertexAttribDivisor(5, 1);

      // Rotation
      gl.bindBuffer(gl.ARRAY_BUFFER, rotationBuffers[i]);
      gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(6);
      gl.vertexAttribDivisor(6, 1);

      // Angular velocity
      gl.bindBuffer(gl.ARRAY_BUFFER, angularVelocityBuffers[i]);
      gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(7);
      gl.vertexAttribDivisor(7, 1);

      // Angular acceleration
      gl.bindBuffer(gl.ARRAY_BUFFER, angularAccelerationBuffers[i]);
      gl.vertexAttribPointer(8, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(8);
      gl.vertexAttribDivisor(8, 1);

      // Angular friction
      gl.bindBuffer(gl.ARRAY_BUFFER, angularFrictionBuffers[i]);
      gl.vertexAttribPointer(9, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(9);
      gl.vertexAttribDivisor(9, 1);

      // Tint
      gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffers[i]);
      gl.vertexAttribPointer(10, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(10);
      gl.vertexAttribDivisor(10, 1);

      // Opacity
      gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffers[i]);
      gl.vertexAttribPointer(11, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(11);
      gl.vertexAttribDivisor(11, 1);

      // Scale
      gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffers[i]);
      gl.vertexAttribPointer(12, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(12);
      gl.vertexAttribDivisor(12, 1);

      // Spawn time
      gl.bindBuffer(gl.ARRAY_BUFFER, spawnTimeBuffers[i]);
      gl.vertexAttribPointer(13, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(13);
      gl.vertexAttribDivisor(13, 1);

      // Texture index
      gl.bindBuffer(gl.ARRAY_BUFFER, textureIndexBuffers[i]);
      gl.vertexAttribPointer(14, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(14);
      gl.vertexAttribDivisor(14, 1);
   
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, OBJECT_BUFFER_CONTAINER_SIZE);
   }

   gl.vertexAttribDivisor(1, 0);
   gl.vertexAttribDivisor(2, 0);
   gl.vertexAttribDivisor(3, 0);
   gl.vertexAttribDivisor(4, 0);
   gl.vertexAttribDivisor(5, 0);
   gl.vertexAttribDivisor(6, 0);
   gl.vertexAttribDivisor(7, 0);
   gl.vertexAttribDivisor(8, 0);
   gl.vertexAttribDivisor(9, 0);
   gl.vertexAttribDivisor(10, 0);
   gl.vertexAttribDivisor(11, 0);
   gl.vertexAttribDivisor(12, 0);
   gl.vertexAttribDivisor(13, 0);
   gl.vertexAttribDivisor(14, 0);
   
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}