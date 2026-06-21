import { mod, murmurHash3, Point, randAngle, randFloat, randInt } from "../../shared/dist/utils.js";

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

const calculateCornerDotProduct = (gridCoordinates: Float32Array, cornerX: number, cornerY: number, gridWidth: number, sampleX: number, sampleY: number): number => {
   const idx = (cornerY * gridWidth + cornerX) * 2;
   const gradientX = gridCoordinates[idx];
   const gradientY = gridCoordinates[idx + 1];

   const offsetX = sampleX - cornerX;
   const offsetY = sampleY - cornerY;

   // Calculate the dot product
   return gradientX * offsetX + gradientY * offsetY;
}

const cosAngles: number[] = [];
const sinAngles: number[] = [];

// @HACK!!! Just remove this. Not worth the loss in terrain accuracy.
for (let i = 0; i < 360; i++) {
   cosAngles.push(Math.cos(i / 180 * Math.PI));
   sinAngles.push(Math.sin(i / 180 * Math.PI));
}

export function generatePerlinNoise1DContinuous(x: number, noiseOffset: number): number {
   const sampleX = noiseOffset - x;

   const x0 = Math.floor(sampleX);
   const x1 = x0 + 1;

   const idx0 = murmurHash3(x0);
   const gradientX0 = cosAngles[idx0 % 360];

   const idx1 = murmurHash3(x1);
   const gradientX1 = cosAngles[idx1 % 360];

   const dotProduct0 = gradientX0 * (sampleX - x0);
   const dotProduct1 = gradientX1 * (sampleX - x1);

   const u = fade(sampleX % 1);
   let val = lerp(dotProduct0, dotProduct1, u);
   
   val = Math.min(Math.max(val, -0.5), 0.5);
   return val + 0.5;
}

let mm = 0;
export function MMM() {
   mm = randFloat(0, 10000);
}

// @TEMPORARY: the thung
let a = 0;
export function generatePerlinNoise(width: number, height: number, scale: number, thung: number): Float32Array {
   const gridWidth = Math.floor(width / scale) + 2;
   const gridHeight = Math.floor(height / scale) + 2;
   const gridSize = gridWidth * gridHeight * 2;
   
   // const gridSeed = randFloat(0, 10000);
   const gridSeed = Math.random() * 1000000 + Math.random();
   const gridCoordinates = new Float32Array(gridSize);
   for (let i = 0; i < gridSize; i += 2) {
      // @HACKE!
      // const degrees = Math.floor(generatePerlinNoise1DContinuous(thung, veryBadHash(i + "")) * 360);
      const iSeed = murmurHash3(i) / 10000;
      const degrees = Math.floor(generatePerlinNoise1DContinuous(thung * thungMult, gridSeed + mm + iSeed) * 360);
      // if(a===0)console.log(i, murmurHash3(i) / 10000, degrees);
      // if (a === 0) {
      //    const noiseOffset = murmurHash3(i);
      //    const x = 0;
      //    const sampleX = noiseOffset - x;

      
      //    const x0 = Math.floor(sampleX);
      //    const x1 = x0 + 1;

      //    const idx0 = murmurHash3(x0);
      //    const gradientX0 = cosAngles[idx0 % 360];

      //    const idx1 = murmurHash3(x1);
      //    const gradientX1 = cosAngles[idx1 % 360];

      //    console.log(noiseOffset, gradientX0, gradientX1);
      //    console.log(generatePerlinNoise1DContinuous(0, murmurHash3(i)))

      //    const dotProduct0 = gradientX0 * (sampleX - x0);
      //    const dotProduct1 = gradientX1 * (sampleX - x1);

      //    console.log(dotProduct0, dotProduct1);
         
      //    const u = fade(sampleX % 1);

      //    console.log(sampleX,u)
         
      //    console.log("-==-=-=-- =--=-=-=")
      // }
      // if (a++ === 0) {
      //    for (let i = 0; i < 10; i += 0.1) {
      //       console.log(i.toFixed(1), murmurHash3(271) / 10000, generatePerlinNoise1DContinuous(i, murmurHash3(271) / 10000), generatePerlinNoise1DContinuous(i, Math.floor(murmurHash3(271) / 10000)));
      //    }
      // }
      
      // const degrees = Math.floor(murmurHash3(i) % 360);
      // const degrees = Math.floor((veryBadHash(i + "") + thung) % 360);
      // const degrees = Math.floor(360 * Math.random());
      gridCoordinates[i] = cosAngles[degrees];
   }
   a++;

   const noise = new Float32Array(width * height);
   let i = 0;
   for (let y = 0; y < height; y++) {
      const sampleY = y / scale;
      const y0 = Math.floor(sampleY);
      const y1 = y0 + 1;

      const v = fade(sampleY % 1);

      for (let x = 0; x < width; x++) {
         const sampleX = x / scale;
         const x0 = Math.floor(sampleX);
         const x1 = x0 + 1;
         
         const dotProduct1 = calculateCornerDotProduct(gridCoordinates, x0, y0, gridWidth, sampleX, sampleY);
         const dotProduct2 = calculateCornerDotProduct(gridCoordinates, x1, y0, gridWidth, sampleX, sampleY);
         const dotProduct3 = calculateCornerDotProduct(gridCoordinates, x0, y1, gridWidth, sampleX, sampleY);
         const dotProduct4 = calculateCornerDotProduct(gridCoordinates, x1, y1, gridWidth, sampleX, sampleY);
         
         const u = fade(sampleX % 1);
         let val = interpolate(dotProduct1, dotProduct2, dotProduct3, dotProduct4, u, v);
         
         val = Math.min(Math.max(val, -0.5), 0.5);
         noise[i] = val + 0.5;

         i++;
      }
   }
   return noise;
}

/**
 * 
 * @param octaves The number of perlin noise layers to use
 * @param lacunarity Controls the decrease in scale between octaves (1+)
 * @param persistance Controls the decrease in weight between octaves (0-1)
 */
export function generateOctavePerlinNoise(width: number, height: number, startingScale: number, octaves: number, lacunarity: number, persistance: number, thung: number = 0): Float32Array {
   const length = width * height;
   
   let totalNoise!: Float32Array
   for (let i = 0; i < octaves; i++) {
      const scale = Math.pow(lacunarity, -i) * startingScale;
      const weightMultiplier = Math.pow(persistance, i);

      const noise = generatePerlinNoise(width, height, scale, thung);
      if (i === 0) {
         totalNoise = noise;
      } else {
         for (let i = 0; i < length; i++) {
            totalNoise[i] += noise[i] * weightMultiplier;
         }
      }
   }

   // Ensure that all values stay below 1
   // @SPEED!!?
   let maxWeight = 1;
   for (let i = 0; i < length; i++) {
      const weight = totalNoise[i];
      if (weight > maxWeight) {
         maxWeight = weight;
      }
   }
   if (maxWeight > 1) {
      // Adjust weights
      for (let i = 0; i < length; i++) {
         totalNoise[i] /= maxWeight;
      }
   }

   return totalNoise;
}

let pointPerlinNoiseGrids: Partial<Record<string, Partial<Record<string, Point>>>> = {};

export function resetPerlinNoiseCache(): void {
   pointPerlinNoiseGrids = {};
}

const thungMult = 0.004;

const calculatePointCornerDotProduct = (grid: Partial<Record<string, Point>>, sampleX: number, sampleY: number, cornerX: number, cornerY: number, thung: number, width: number): number => {
   const key = cornerY + "-" + cornerX; // @Speed
   let corner = grid[key];
   
   if (corner === undefined) {
      const gridSeed = 0;
      const i = cornerY * width + cornerX;
      const iSeed = murmurHash3(i) / 10000;
      const dir = Math.floor(generatePerlinNoise1DContinuous(thung * thungMult, gridSeed + mm + iSeed) * 360);
      
      corner = new Point(Math.sin(dir), Math.cos(dir));
      grid[key] = corner;
   }

   const directionVectorX = sampleX - cornerX;
   const directionVectorY = sampleY - cornerY;

   // Calculate the dot product
   return corner.x * directionVectorX + corner.y * directionVectorY;
}

export function generatePointPerlinNoise(x: number, y: number, scale: number, name: string, thung?: number, width?: number): number {
   let grid = pointPerlinNoiseGrids[name];
   if (grid === undefined) {
      grid = {};
      pointPerlinNoiseGrids[name] = grid;
   }

   const sampleX = x / scale;
   const sampleY = y / scale;

   const x0 = Math.floor(sampleX);
   const x1 = x0 + 1;
   const y0 = Math.floor(sampleY);
   const y1 = y0 + 1;

   const dot0 = calculatePointCornerDotProduct(grid, sampleX, sampleY, x0, y0, thung || 0, width || 0);
   const dot1 = calculatePointCornerDotProduct(grid, sampleX, sampleY, x1, y0, thung || 0, width || 0);
   const dot2 = calculatePointCornerDotProduct(grid, sampleX, sampleY, x0, y1, thung || 0, width || 0);
   const dot3 = calculatePointCornerDotProduct(grid, sampleX, sampleY, x1, y1, thung || 0, width || 0);

   const u = fade(sampleX % 1);
   const v = fade(sampleY % 1);
   let val = interpolate(dot0, dot1, dot2, dot3, u, v);
   val = Math.min(Math.max(val, -0.5), 0.5);
   return val + 0.5;
}