import { lerp, Vector, Point } from './utils';

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

export function generatePerlinNoise(width: number, height: number, scale: number): Array<Array<number>> {
   const grid = new Array<Array<Vector>>();
   for (let i = 0; i <= height / scale + 1; i++) {
      const row = new Array<Vector>();
      for (let j = 0; j <= width / scale + 1; j++) {
         row.push(Vector.randomUnitVector());
      }
      grid.push(row);
   }

   const noise = new Array<Array<number>>();
   for (let y = 0; y < height; y++) {
      const row = new Array<number>();
      for (let x = 0; x < width; x++) {
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

            const corner = grid[coords[0]][coords[1]];
            const cornerPos = new Point(coords[1], coords[0]);
            const offsetVector = samplePoint.convertToVector(cornerPos);
            const dot = corner.convertToPoint().dot(offsetVector.convertToPoint());
            dotProducts.push(dot);
         }

         const u = fade(sampleX % 1);
         const v = fade(sampleY % 1);
         let val = interpolate(dotProducts[0], dotProducts[1], dotProducts[2], dotProducts[3], u, v);
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
      const scale = 1 / Math.pow(lacunarity, i) * startingScale;
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