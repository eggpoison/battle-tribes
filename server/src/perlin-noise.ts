import { Vector, Point } from "webgl-test-shared/dist/utils";
import SRandom from "./SRandom";

const lerp = (start: number, end: number, amount: number): number => {
   return start * (1 - amount) + end * amount;
}

// Lerps between the four corner dot products
const interpolate = (dot0: number, dot1: number, dot2: number, dot3: number, localX: number, localY: number): number => {
   const a = lerp(dot0, dot1, localX);
   const b = lerp(dot2, dot3, localX);
   return lerp(a, b, localY);
}

// Smoothly interpolates the values
const fade = (t: number): number => {
   return t * t * t * (t * (t * 6 - 15) + 10);
}

const calculateCornerDotProduct = (gridXCoordinates: number[][], gridYCoordinates: number[][], cornerX: number, cornerY: number, sampleX: number, sampleY: number): number => {
   const gradientX = gridXCoordinates[cornerY][cornerX];
   const gradientY = gridYCoordinates[cornerY][cornerX];

   const offsetX = sampleX - cornerX;
   const offsetY = sampleY - cornerY;

   // Calculate the dot product
   const dotProduct = gradientX * offsetX + gradientY * offsetY;
   return dotProduct;
}

const cosAngles = new Array<number>();
const sinAngles = new Array<number>();

for (let i = 0; i < 360; i++) {
   cosAngles.push(Math.cos(i / 180 * Math.PI));
   sinAngles.push(Math.sin(i / 180 * Math.PI));
}

export function generatePerlinNoise(width: number, height: number, scale: number): Array<Array<number>> {
   const gridXCoordinates = new Array<Array<number>>();
   const gridYCoordinates = new Array<Array<number>>();
   for (let i = 0; i <= height / scale + 1; i++) {
      const xCoordinates = new Array<number>();
      const yCoordinates = new Array<number>();
      for (let j = 0; j <= width / scale + 1; j++) {
         const degrees = Math.floor(360 * SRandom.next());
         const x = cosAngles[degrees];
         const y = sinAngles[degrees];
         xCoordinates.push(x);
         yCoordinates.push(y);
      }
      gridXCoordinates.push(xCoordinates);
      gridYCoordinates.push(yCoordinates);
   }

   const noise = new Array<Array<number>>();
   for (let y = 0; y < height; y++) {
      const row = new Array<number>();
      for (let x = 0; x < width; x++) {
         const sampleX = x / scale;
         const sampleY = y / scale;

         const x0 = Math.floor(sampleX);
         const x1 = x0 + 1;
         const y0 = Math.floor(sampleY);
         const y1 = y0 + 1;

         const dotProduct1 = calculateCornerDotProduct(gridXCoordinates, gridYCoordinates, x0, y0, sampleX, sampleY);
         const dotProduct2 = calculateCornerDotProduct(gridXCoordinates, gridYCoordinates, x1, y0, sampleX, sampleY);
         const dotProduct3 = calculateCornerDotProduct(gridXCoordinates, gridYCoordinates, x0, y1, sampleX, sampleY);
         const dotProduct4 = calculateCornerDotProduct(gridXCoordinates, gridYCoordinates, x1, y1, sampleX, sampleY);

         const u = fade(sampleX % 1);
         const v = fade(sampleY % 1);
         let val = interpolate(dotProduct1, dotProduct2, dotProduct3, dotProduct4, u, v);
         val = Math.min(Math.max(val, -0.5), 0.5);
         row.push(val + 0.5);
      }
      noise.push(row);
   }
   return noise;
}

/**
 * 
 * @param octaves The number of perlin noise layers to use
 * @param lacunarity Controls the increase in scale between octaves (1+)
 * @param persistance Controls the decrease in weight between octaves (0-1)
 */
export function generateOctavePerlinNoise(width: number, height: number, startingScale: number, octaves: number, lacunarity: number, persistance: number): Array<Array<number>> {
   let totalNoise = new Array<Array<number>>();
   for (let i = 0; i < octaves; i++) {
      const scale = Math.pow(lacunarity, -i) * startingScale;
      const weightMultiplier = Math.pow(persistance, i);

      const noise = generatePerlinNoise(width, height, scale);
      if (i === 0) {
         totalNoise = noise;
      } else {
         for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
               totalNoise[y][x] += noise[y][x] * weightMultiplier;
            }
         }
      }
   }

   // Ensure that all values stay below 1

   let maxWeight = 1;
   for (const row of totalNoise) {
      for (const weight of row) {
         if (weight > maxWeight) maxWeight = weight;
      }
   }
   if (maxWeight > 1) {
      // Adjust weights
      for (let y = 0; y < height; y++) {
         for (let x = 0; x < width; x++) {
            totalNoise[y][x] /= maxWeight;
         }
      }
   }

   return totalNoise;
}

let pointPerlinNoiseGrids: Partial<Record<string, Partial<Record<string, Vector>>>> = {};

export function resetPerlinNoiseCache(): void {
   pointPerlinNoiseGrids = {};
}

export function generatePointPerlinNoise(x: number, y: number, scale: number, name: string): number {
   let grid = pointPerlinNoiseGrids[name];
   if (typeof grid === "undefined") {
      grid = {};
      pointPerlinNoiseGrids[name] = grid;
   }

   const sampleX = x / scale;
   const sampleY = y / scale;
   const samplePoint = new Point(sampleX, sampleY);

   const x0 = Math.floor(sampleX);
   const x1 = x0 + 1;
   const y0 = Math.floor(sampleY);
   const y1 = y0 + 1;

   const cornerCoords: ReadonlyArray<[number, number]> = [[y0, x0], [y0, x1], [y1, x0], [y1, x1]];

   const dotProducts = new Array<number>();
   for (let i = 0; i < 4; i++) {
      const coords = cornerCoords[i];

      const key = coords[0] + "-" + coords[1]; // @Speed
      let corner = grid[key];
      
      if (typeof corner === "undefined") {
         corner = new Vector(1, 2 * Math.PI * SRandom.next());
         grid[key] = corner;
      }

      const cornerPos = new Point(coords[1], coords[0]);
      const offsetVector = samplePoint.convertToVector(cornerPos);

      // Calculate the dot product
      const cornerCartesian = corner.convertToPoint();
      const dotProduct = cornerCartesian.calculateDotProduct(offsetVector.convertToPoint());
      dotProducts.push(dotProduct);
   }

   const u = fade(sampleX % 1);
   const v = fade(sampleY % 1);
   let val = interpolate(dotProducts[0], dotProducts[1], dotProducts[2], dotProducts[3], u, v);
   val = Math.min(Math.max(val, -0.5), 0.5);
   return val + 0.5;
}