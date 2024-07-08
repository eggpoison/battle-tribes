import { TECHS, TechID, TechInfo, getTechByID } from "webgl-test-shared/dist/techs";
import { angle } from "webgl-test-shared/dist/utils";
import Game from "../../Game";
import { createWebGLProgram, halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "../../webgl";
import { techIsHovered } from "../../components/game/tech-tree/TechTree";

const ConnectorType = {
   unlocked: 0,
   locked: 1,
   conflicting: 2
}

const CONFLICTING_CONNECTOR_WIDTH = 10;
const CONNECTOR_WIDTH = 15;

let gl: WebGL2RenderingContext;

let backgroundProgram: WebGLProgram;
let connectorProgram: WebGLProgram;

// @Cleanup: Weird to export like this
export let techTreeX = 0;
export let techTreeY = 0;
export let techTreeZoom = 1;

export function getTechTreeGL(): WebGL2RenderingContext {
   return gl;
}

export function updateTechTreeCanvasSize(): void {
   gl.viewport(0, 0, windowWidth, windowHeight);
}

export function setTechTreeX(x: number): void {
   techTreeX = x;
}

export function setTechTreeY(y: number): void {
   techTreeY = y;
}

export function setTechTreeZoom(zoom: number): void {
   techTreeZoom = zoom;
}

// @Cleanup: Copy and paste
export function createTechTreeGLContext(): void {
   const canvas = document.getElementById("tech-tree-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}

const createBackgroundShaders = (): void => {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(location = 0) in vec2 a_position;

   out vec2 v_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);

      v_position = a_position;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;

   #define BASE_BG_COLOUR 0.1

   #define PI 3.14159265358979323846

   uniform vec2 u_screenSize;
   uniform float u_zoom;
   uniform vec2 u_scrollPos;
   uniform vec2 u_techPositions[128];

   in vec2 v_position;
   
   out vec4 outputColour;
   
   float rand(vec2 c){
      return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
   }
   
   float noise(vec2 p, float freq ){
      // float unit = u_screenWidth/freq;
      float unit = 1000.0/freq;
      vec2 ij = floor(p/unit);
      vec2 xy = mod(p,unit)/unit;
      //xy = 3.*xy*xy-2.*xy*xy*xy;
      xy = .5*(1.-cos(PI*xy));
      float a = rand((ij+vec2(0.,0.)));
      float b = rand((ij+vec2(1.,0.)));
      float c = rand((ij+vec2(0.,1.)));
      float d = rand((ij+vec2(1.,1.)));
      float x1 = mix(a, b, xy.x);
      float x2 = mix(c, d, xy.x);
      return mix(x1, x2, xy.y);
   }
   
   float pNoise(vec2 p, int res){
      float persistance = .5;
      float n = 0.;
      float normK = 0.;
      float f = 4.;
      float amp = 1.;
      int iCount = 0;
      for (int i = 0; i<50; i++){
         n+=amp*noise(p, f);
         f*=2.;
         normK+=amp;
         amp*=persistance;
         if (iCount == res) break;
         iCount++;
      }
      float nf = n/normK;
      return nf*nf*nf*nf;
   }

   vec2 getPos(float scaleFactor, float offset) {
      vec2 pos = v_position;
      pos *= u_screenSize / 1000.0;
      return (pos * 500.0 * scaleFactor) / u_zoom - u_scrollPos * 0.8 * scaleFactor * scaleFactor + vec2(offset, offset);
   }
   
   void main() {
      float height1 = pNoise(getPos(0.25, 10000.0), 5);
      
      float colour1;
      if (height1 > 0.2) {
         colour1 = 0.15;
      } else {
         colour1 = BASE_BG_COLOUR;
      }

      float height2 = pNoise(getPos(0.5, 500.0), 5);
      
      float colour2;
      if (height2 > 0.2) {
         colour2 = 0.1175;
      } else {
         colour2 = BASE_BG_COLOUR;
      }

      float height3 = pNoise(getPos(1.0, 0.0), 5);
      
      float colour3;
      if (height3 > 0.2) {
         colour3 = 0.2;
      } else {
         colour3 = BASE_BG_COLOUR;
      }

      float colour = max(colour1, colour2);
      colour = max(colour, colour3);

      vec2 position = v_position * u_screenSize / 1000.0;
      position = (position * 500.0 / u_zoom - u_scrollPos) / 16.0;
      float minDistance = 9999.0;
      for (int i = 0; i < 128; i++) {
         vec2 techPos = u_techPositions[i];
         float dist = distance(position, techPos);
         if (dist < minDistance) {
            minDistance = dist;
         }
      }

      if (minDistance > 30.0) {
         float fadeFactor = (minDistance - 30.0) * 0.05;
         colour = mix(colour, 0.05, fadeFactor);
      }
      
      outputColour = vec4(colour, colour, colour, 1.0);
   }
   `;
   
   backgroundProgram = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
}

const createConnectorShaders = (): void => {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_type;
   layout(location = 2) in vec2 a_startPos;
   layout(location = 3) in vec2 a_endPos;

   out vec2 v_position;
   out float v_type;
   out vec2 v_startPos;
   out vec2 v_endPos;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);

      v_position = a_position;
      v_type = a_type;
      v_startPos = a_startPos;
      v_endPos = a_endPos;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   #define UNLOCKED_COLOUR 0.2, 1.0, 0.2
   #define UNLOCKED_COLOUR_DARK 0.0, 143.0/255.0, 0.0
   // @Incomplete: make locked colour more orange
   #define LOCKED_COLOUR 1.0, 0.3, 0.1
   #define LOCKED_COLOUR_DARK 156.0/255.0, 4.0/255.0, 2.0/255.0
   #define CONFLICTING_COLOUR 1.0, 0.0, 0.0

   // @Speed: Use uniform block
   uniform vec2 u_screenSize;
   uniform float u_zoom;
   uniform vec2 u_scrollPos;
   // @Speed: Use uniform block
   uniform float u_time;

   in vec2 v_position;
   in float v_type;
   in vec2 v_startPos;
   in vec2 v_endPos;
   
   out vec4 outputColour;

   float minimum_distance(vec2 v, vec2 w, vec2 p) {
      // Return minimum distance between line segment vw and point p
      float l2 = pow(distance(v, w), 2.0);  // i.e. |w-v|^2 -  avoid a sqrt
      if (l2 == 0.0) return distance(p, v);   // v == w case
      // Consider the line extending the segment, parameterized as v + t (w - v).
      // We find projection of point p onto the line. 
      // It falls where t = [(p-v) . (w-v)] / |w-v|^2
      // We clamp t from [0,1] to handle points outside the segment vw.
      // float t = max(0, min(1, dot(p - v, w - v) / l2));
      float t = dot(p - v, w - v) / l2;
      vec2 projection = v + t * (w - v);  // Projection falls on the segment
      return distance(p, projection);
    }
   
   void main() {
      vec2 position = v_position * u_screenSize / 1000.0;
      position = (position * 500.0 / u_zoom - u_scrollPos) / 16.0;

      float dist = minimum_distance(v_startPos, v_endPos, position); 
      
      if (v_type == ${ConnectorType.unlocked.toFixed(1)}) {
         outputColour = vec4(UNLOCKED_COLOUR, 1.0);
         outputColour.rgb = mix(vec3(UNLOCKED_COLOUR), vec3(UNLOCKED_COLOUR_DARK), dist * dist);
      } else if (v_type == ${ConnectorType.locked.toFixed(1)}) {
         outputColour = vec4(LOCKED_COLOUR, 1.0);
         outputColour.rgb = mix(vec3(LOCKED_COLOUR), vec3(LOCKED_COLOUR_DARK), dist * dist);
      } else if (v_type == ${ConnectorType.conflicting.toFixed(1)}) {
         vec2 endOffset = v_endPos - v_startPos;
         vec2 perpendicularPos = v_startPos + vec2(-endOffset.y, endOffset.x);
         dist = minimum_distance(v_startPos, perpendicularPos, position);

         outputColour = vec4(CONFLICTING_COLOUR, sin(dist * 1.5 + u_time * 0.005) * 0.5 + 0.5);
      }
   }
   `;

   connectorProgram = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
}

export function createTechTreeShaders(): void {
   createBackgroundShaders();
   createConnectorShaders();
}

const renderBackground = (): void => {
   const techPositions = new Array<number>();
   for (const tech of TECHS) {
      if (techIsDirectlyAccessible(tech)) {
         techPositions.push(tech.positionX);
         techPositions.push(tech.positionY);
      }
   }

   gl.useProgram(backgroundProgram);

   const screenWidthUniformLocation = gl.getUniformLocation(backgroundProgram, "u_screenSize");
   gl.uniform2f(screenWidthUniformLocation, windowWidth, windowHeight);

   const zoomUniformLocation = gl.getUniformLocation(backgroundProgram, "u_zoom");
   gl.uniform1f(zoomUniformLocation, techTreeZoom);

   const scrollPosUniformLocation = gl.getUniformLocation(backgroundProgram, "u_scrollPos");
   gl.uniform2f(scrollPosUniformLocation, techTreeX, -techTreeY);

   const techPositionsUniformLocation = gl.getUniformLocation(backgroundProgram, "u_techPositions");
   gl.uniform2fv(techPositionsUniformLocation, techPositions);
   
   const vertices = [
      -1, -1,
      1, 1,
      -1, 1,
      -1, -1,
      1, -1,
      1, 1
   ];
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/** X position in the screen (0 = left, windowWidth = right) */
const calculateXScreenPos = (x: number): number => {
   // Account for the player position
   let position = x + techTreeX;
   // Account for zoom
   position = position * techTreeZoom + halfWindowWidth;
   position = position / halfWindowWidth - 1;
   return position;
}

/** Y position in the screen (0 = bottom, windowHeight = top) */
const calculateYScreenPos = (y: number): number => {
   // Account for the player position
   let position = y - techTreeY;
   // Account for zoom
   position = position * techTreeZoom + halfWindowHeight;
   position = position / halfWindowHeight - 1;
   return position;
}

const addConnectorVertices = (vertices: Array<number>, startTech: TechInfo, endTech: TechInfo, type: number): void => {
   const direction = angle(endTech.positionX - startTech.positionX, endTech.positionY - startTech.positionY);
   const perpendicularDirection1 = direction + Math.PI / 2;
   const perpendicularDirection2 = direction - Math.PI / 2;

   const a = 16; // @Cleanup @Hack: what is this?

   let connectorWidth: number;
   if (type === ConnectorType.conflicting) {
      connectorWidth = CONFLICTING_CONNECTOR_WIDTH;
   } else {
      if (techIsHovered(startTech.id) || techIsHovered(endTech.id)) {
         connectorWidth = CONNECTOR_WIDTH * 1.3;
      } else {
         connectorWidth = CONNECTOR_WIDTH;
      }
   }

   const topLeftX = calculateXScreenPos(startTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection1));
   const topLeftY = calculateYScreenPos(startTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection1));
   const bottomLeftX = calculateXScreenPos(startTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection2));
   const bottomLeftY = calculateYScreenPos(startTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection2));
   const topRightX = calculateXScreenPos(endTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection1));
   const topRightY = calculateYScreenPos(endTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection1));
   const bottomRightX = calculateXScreenPos(endTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection2));
   const bottomRightY = calculateYScreenPos(endTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection2));

   vertices.push(
      bottomLeftX, bottomLeftY, type, startTech.positionX, startTech.positionY, endTech.positionX, endTech.positionY,
      bottomRightX, bottomRightY, type, startTech.positionX, startTech.positionY, endTech.positionX, endTech.positionY,
      topLeftX, topLeftY, type, startTech.positionX, startTech.positionY, endTech.positionX, endTech.positionY,
      topLeftX, topLeftY, type, startTech.positionX, startTech.positionY, endTech.positionX, endTech.positionY,
      bottomRightX, bottomRightY, type, startTech.positionX, startTech.positionY, endTech.positionX, endTech.positionY,
      topRightX, topRightY, type, startTech.positionX, startTech.positionY, endTech.positionX, endTech.positionY
   );
}

export function techIsDirectlyAccessible(techInfo: TechInfo): boolean {
   if (techInfo.blacklistedTribes.includes(Game.tribe.tribeType)) {
      return false;
   }
   
   if (Game.tribe.hasUnlockedTech(techInfo.id)) {
      return true;
   }
   
   // Make sure all dependencies have been unlocked
   for (const dependencyTechID of techInfo.dependencies) {
      if (!Game.tribe.hasUnlockedTech(dependencyTechID)) {
         return false;
      }
   }

   return true;
}

const calculateConnectorVertices = (): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   // For all unlocked techs, draw the connectors for their dependencies
   for (const techID of Game.tribe.unlockedTechs) {
      const tech = getTechByID(techID);
      for (const dependencyTechID of tech.dependencies) {
         const dependencyTech = getTechByID(dependencyTechID);
         addConnectorVertices(vertices, dependencyTech, tech, ConnectorType.unlocked);
      }
   }

   // For all directly accessible locked techs, draw the connectors for their dependencies
   for (const tech of TECHS) {
      if (!Game.tribe.hasUnlockedTech(tech.id) && techIsDirectlyAccessible(tech)) {
         for (const dependencyTechID of tech.dependencies) {
            const dependencyTech = getTechByID(dependencyTechID);
            addConnectorVertices(vertices, dependencyTech, tech, ConnectorType.locked);
         }
      }
   }

   // Conflicting connection ids
   const conflictingConnectionIDs = new Array<TechID>();
   for (const tech of TECHS) {
      if (!Game.tribe.hasUnlockedTech(tech.id) && techIsDirectlyAccessible(tech)) {
         for (const conflictingTechID of tech.conflictingTechs) {
            if (conflictingConnectionIDs.includes(tech.id) || conflictingConnectionIDs.includes(conflictingTechID)) {
               continue;
            }
            
            const otherTech = getTechByID(conflictingTechID);
            addConnectorVertices(vertices, otherTech, tech, ConnectorType.conflicting);

            conflictingConnectionIDs.push(conflictingTechID);
         }
      }
   }

   return vertices;
}

const renderConnectors = (): void => {
   gl.useProgram(connectorProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const screenWidthUniformLocation = gl.getUniformLocation(connectorProgram, "u_screenSize");
   gl.uniform2f(screenWidthUniformLocation, windowWidth, windowHeight);

   const zoomUniformLocation = gl.getUniformLocation(connectorProgram, "u_zoom");
   gl.uniform1f(zoomUniformLocation, techTreeZoom);

   const scrollPosUniformLocation = gl.getUniformLocation(connectorProgram, "u_scrollPos");
   gl.uniform2f(scrollPosUniformLocation, techTreeX, -techTreeY);

   const timeUniformLocation = gl.getUniformLocation(connectorProgram, "u_time");
   gl.uniform1f(timeUniformLocation, performance.now());

   const vertices = calculateConnectorVertices();

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 7);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function renderTechTree(): void {
   gl.clearColor(0, 0,0, 1);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   renderBackground();
   renderConnectors();
}