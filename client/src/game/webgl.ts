import { Point, polarVec2 } from "battletribes-shared/utils";
import { isDev } from "./utils";
import { updateTechTreeCanvasSize } from "./rendering/webgl/tech-tree-rendering";
import { TEXTURE_IMAGE_RECORD } from "./textures";
import { getTribePlanVisualiserGL } from "./rendering/tribe-plan-visualiser/tribe-plan-visualiser";

export const CIRCLE_VERTEX_COUNT = 50;

let canvas: HTMLCanvasElement;
export let gl: WebGL2RenderingContext;

export let windowWidth = window.innerWidth;
export let windowHeight = window.innerHeight;
export let halfWindowWidth = windowWidth / 2;
export let halfWindowHeight = windowHeight / 2;

export let MAX_ACTIVE_TEXTURE_UNITS = 8;

export const tempFloat32ArrayLength1 = new Float32Array(1);
export const tempFloat32ArrayLength2 = new Float32Array(2);
export const tempFloat32ArrayLength3 = new Float32Array(3);

export function resizeCanvas(): void {
   windowWidth = window.innerWidth;
   windowHeight = window.innerHeight;

   halfWindowWidth = windowWidth / 2;
   halfWindowHeight = windowHeight / 2;

   if (typeof canvas === "undefined") return;

   // Update the size of the canvas
   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;

   gl.viewport(0, 0, windowWidth, windowHeight);

   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;
   textCanvas.width = windowWidth;
   textCanvas.height = windowHeight;

   const techTreeCanvas = document.getElementById("tech-tree-canvas") as HTMLCanvasElement;
   techTreeCanvas.width = windowWidth;
   techTreeCanvas.height = windowHeight;
   updateTechTreeCanvasSize();

   const tribePlanVisualiserCanvas = document.getElementById("tribe-plan-visualiser-canvas") as HTMLCanvasElement;
   tribePlanVisualiserCanvas.width = windowWidth;
   tribePlanVisualiserCanvas.height = windowHeight;
   getTribePlanVisualiserGL().viewport(0, 0, windowWidth, windowHeight);
}

// Run the resizeCanvas function whenever the window is resize
window.addEventListener("resize", resizeCanvas);

export function createWebGLContext(): void {
   const canvasCheck = document.getElementById("game-canvas");
   if (canvasCheck instanceof HTMLCanvasElement) {
      canvas = canvasCheck;
   }
   
   const glAttempt = canvas.getContext("webgl2", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

   MAX_ACTIVE_TEXTURE_UNITS = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

export function createWebGLProgram(gl: WebGL2RenderingContext, vertexShaderText: string, fragmentShaderText: string): WebGLProgram {
   const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
   gl.shaderSource(vertexShader, vertexShaderText);
   gl.compileShader(vertexShader);
   
   const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
   gl.shaderSource(fragmentShader, fragmentShaderText);
   gl.compileShader(fragmentShader);

   // 
   // Create the program and attach shaders to the program
   // 

   const program = gl.createProgram()!;

   gl.attachShader(program, vertexShader);
   gl.attachShader(program, fragmentShader);

   gl.linkProgram(program);
   if (isDev() && !gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (isDev() && !gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
         console.warn("ERROR compiling vertex shader!");
         throw new Error(gl.getShaderInfoLog(vertexShader)!);
      }
      if (isDev() && !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
         console.warn("ERROR compiling fragment shader!");
         throw new Error(gl.getShaderInfoLog(fragmentShader)!); 
      }
      throw new Error("ERROR linking program! " + gl.getProgramInfoLog(program));
   }

   if (isDev()) {
      gl.validateProgram(program);
      if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
         throw new Error("ERROR validating program! " + gl.getProgramInfoLog(program));
      }
   }

   return program;
}

export function generateLine(startPosition: Point, endPosition: Point, thickness: number, r: number, g: number, b: number): Array<number> {
   // @Speed: Garbage collection
   
   let offset = endPosition.copy();
   offset.subtract(startPosition);
   const offsetVector = offset.convertToVector();
   offsetVector.magnitude = thickness / 2;
   offset = offsetVector.convertToPoint();

   const leftOffset = new Point(-offset.y, offset.x);
   const rightOffset = new Point(offset.y, -offset.x);

   // const bottomLeftX = startPosition.x - offset.x;
   const bl = startPosition.copy();
   bl.add(leftOffset);
   const br = startPosition.copy();
   br.add(rightOffset);
   const tl = endPosition.copy();
   tl.add(leftOffset);
   const tr = endPosition.copy();
   tr.add(rightOffset);

   const vertices: Array<number> = [
      bl.x, bl.y, r, g, b,
      br.x, br.y, r, g, b,
      tl.x, tl.y, r, g, b,
      tl.x, tl.y, r, g, b,
      br.x, br.y, r, g, b,
      tr.x, tr.y, r, g, b
   ];

   return vertices;
}

export function generateThickCircleWireframeVertices(position: Point, radius: number, thickness: number, r: number, g: number, b: number): Array<number> {
   const vertices = new Array<number>();
   const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;
   
   // Add the outer vertices
   for (let radians = 0, n = 0; n < CIRCLE_VERTEX_COUNT; radians += step, n++) {
      // @Speed: Garbage collection
      
      // Trig shenanigans to get x and y coords
      const bl = polarVec2(radius, radians);
      const br = polarVec2(radius, radians + step);
      const tl = polarVec2(radius + thickness, radians);
      const tr = polarVec2(radius + thickness, radians + step);

      bl.add(position);
      br.add(position);
      tl.add(position);
      tr.add(position);

      vertices.push(
         bl.x, bl.y, r, g, b,
         br.x, br.y, r, g, b,
         tl.x, tl.y, r, g, b,
         tl.x, tl.y, r, g, b,
         br.x, br.y, r, g, b,
         tr.x, tr.y, r, g, b
      );
   }

   return vertices;
}

export function getCirclePoint(numPoints: number, i: number, origin: Readonly<Point>, radius: number): Point {
   const radians = i / numPoints * 2 * Math.PI;

   const x = origin.x + radius * Math.sin(radians);
   const y = origin.y + radius * Math.cos(radians);
   return new Point(x, y);
}

export function createTexture(width: number, height: number): WebGLTexture {
   const texture = gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D, texture);
   
   // Define size and format of level 0
   const level = 0;
   const internalFormat = gl.RGBA;
   const border = 0;
   const format = gl.RGBA;
   const type = gl.UNSIGNED_BYTE;
   const data = null;
   gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);
   
   // Set the filtering so we don't need mips
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

   return texture;
}

export function createTextureArray(textureSources: ReadonlyArray<string>, width: number, height: number, numLevels: number): WebGLTexture {
   const textureArray = gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);
   gl.texStorage3D(gl.TEXTURE_2D_ARRAY, numLevels, gl.RGBA8, width, height, textureSources.length);

   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   
   // Set all texture units
   for (let i = 0; i < textureSources.length; i++) {
      const textureSource = textureSources[i];
      const image = TEXTURE_IMAGE_RECORD[textureSource];
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, width, height, 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
   }

   // @Cleanup: why do we do this? shouldn't we not need mipmaps?
   gl.generateMipmap(gl.TEXTURE_2D_ARRAY);

   return textureArray;
}