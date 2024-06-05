import { Point } from "webgl-test-shared/dist/utils";
import { isDev } from "./utils";
import { updateTechTreeCanvasSize } from "./rendering/tech-tree-rendering";

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

export const CAMERA_UNIFORM_BUFFER_BINDING_INDEX = 0;
export const TIME_UNIFORM_BUFFER_BINDING_INDEX = 1;

export function resizeCanvas(): void {
   if (typeof canvas === "undefined") return;

   // Update the size of the canvas
   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;

   windowWidth = window.innerWidth;
   windowHeight = window.innerHeight;

   halfWindowWidth = windowWidth / 2;
   halfWindowHeight = windowHeight / 2;

   gl.viewport(0, 0, windowWidth, windowHeight);

   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;
   textCanvas.width = windowWidth;
   textCanvas.height = windowHeight;

   const techTreeCanvas = document.getElementById("tech-tree-canvas") as HTMLCanvasElement;
   techTreeCanvas.width = windowWidth;
   techTreeCanvas.height = windowHeight;
   updateTechTreeCanvasSize();
}

// Run the resizeCanvas function whenever the window is resize
window.addEventListener("resize", resizeCanvas);

export function createWebGLContext(): void {
   canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

   MAX_ACTIVE_TEXTURE_UNITS = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

export function createWebGLProgram(glRenderingContext: WebGL2RenderingContext, vertexShaderText: string, fragmentShaderText: string): WebGLProgram {
   // Create shaders
   const vertexShader = glRenderingContext.createShader(glRenderingContext.VERTEX_SHADER)!;
   const fragmentShader = glRenderingContext.createShader(glRenderingContext.FRAGMENT_SHADER)!;

   glRenderingContext.shaderSource(vertexShader, vertexShaderText);
   glRenderingContext.shaderSource(fragmentShader, fragmentShaderText);

   glRenderingContext.compileShader(vertexShader);
   if (isDev() && !glRenderingContext.getShaderParameter(vertexShader, glRenderingContext.COMPILE_STATUS)) {
      throw new Error("ERROR compiling vertex shader! " + glRenderingContext.getShaderInfoLog(vertexShader));
   }

   glRenderingContext.compileShader(fragmentShader);
   if (isDev() && !glRenderingContext.getShaderParameter(fragmentShader, glRenderingContext.COMPILE_STATUS)) {
      throw new Error("ERROR compiling fragment shader! " + glRenderingContext.getShaderInfoLog(fragmentShader));
   }

   // 
   // Create the program and attach shaders to the program
   // 

   const program = glRenderingContext.createProgram()!;

   glRenderingContext.attachShader(program, vertexShader);
   glRenderingContext.attachShader(program, fragmentShader);

   glRenderingContext.linkProgram(program);
   if (isDev() && !glRenderingContext.getProgramParameter(program, glRenderingContext.LINK_STATUS)) {
      throw new Error("ERROR linking program! " + glRenderingContext.getProgramInfoLog(program));
   }

   if (isDev()) {
      glRenderingContext.validateProgram(program);
      if (!glRenderingContext.getProgramParameter(program, glRenderingContext.VALIDATE_STATUS)) {
         throw new Error("ERROR validating program! " + glRenderingContext.getProgramInfoLog(program));
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
      const bl = Point.fromVectorForm(radius, radians);
      const br = Point.fromVectorForm(radius, radians + step);
      const tl = Point.fromVectorForm(radius + thickness, radians);
      const tr = Point.fromVectorForm(radius + thickness, radians + step);

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