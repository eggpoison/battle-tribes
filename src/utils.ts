export function randFloat(min: number, max: number): number {
   return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer inclusively.
 * @param min The minimum value of the random number.
 * @param max The maximum value of the random number.
 * @returns A random integer between the min and max values.
 */
export function randInt(min: number, max: number): number {
   return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randItem<T>(arr: Array<T> | ReadonlyArray<T>): T {
   return arr[Math.floor(Math.random() * arr.length)];
}

export function chooseRandomItems<T>(arr: Array<T>, numItems: number): Array<T> {
   if (numItems > arr.length) {
      throw new Error(`Tried to find ${numItems} items in an array only ${arr.length} items long!`);
   }

   const remainingArr = arr.slice();

   const chosenItems = new Array<T>();
   for (let i = 0; i < numItems; i++) {
      const idx = Math.floor(Math.random() * remainingArr.length);
      chosenItems.push(remainingArr[idx]);

      remainingArr.splice(idx, 1);
   }

   return chosenItems;
}

export class Point {
   public x: number;
   public y: number;

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public add(point2: Point): Point {
      return new Point(
         this.x + point2.x,
         this.y + point2.y
      );
   };

   public subtract(point2: Point): Point {
      return new Point(
         this.x - point2.x,
         this.y - point2.y
      );
   }

   public dot(point2: Point): number {
      return this.x * point2.x + this.y * point2.y;
   }

   public distanceFrom(point2: Point): number {
      const distance = Math.sqrt(Math.pow(this.x - point2.x, 2) + Math.pow(this.y - point2.y, 2));
      return distance;
   };

   public distanceFromRectangle(minX: number, maxX: number, minY: number, maxY: number): number {
      const dx = Math.max(minX - this.x, 0, this.x - maxX);
      const dy = Math.max(minY - this.y, 0, this.y - maxY);
      return Math.sqrt(dx*dx + dy*dy);
   }

   public angleBetween(point2: Point): number {
      const angle = Math.atan2(point2.y - this.y, point2.x - this.x);
      return angle;
   }

   public convertToVector(point2?: Point): Vector {
      const targetPoint = point2 || new Point(0, 0);

      const distance = this.distanceFrom(targetPoint);
      const angle = targetPoint.angleBetween(this);
      return new Vector(distance, angle);
   }
}

export function getRandomAngle() {
   return Math.random() * 360;
}

export class Vector {
   public magnitude: number;
   public direction: number;

   constructor(magnitude: number, direction: number) {
      this.magnitude = magnitude;
      this.direction = direction;
   }

   public convertToPoint(): Point {
      const x = Math.cos(this.direction) * this.magnitude;
      const y = Math.sin(this.direction) * this.magnitude;
      return new Point(x, y);
   }

   public add(vector2: Vector): Vector {
      return (this.convertToPoint().add(vector2.convertToPoint())).convertToVector();
   }

   public static randomUnitVector(): Vector {
      const theta = randFloat(0, 360);
      return new Vector(1, theta);
   }

   public copy(): Vector {
      return new Vector(this.magnitude, this.direction);
   }
}

export function lerp(start: number, end: number, amount: number): number {
   return start * (1 - amount) + end * amount;
}

/**
 * Checks if the game is in development mode.
 * @returns If the game is in development mode.
 */
export function isDev(): boolean {
   return !process.env.NODE_ENV || process.env.NODE_ENV === "development";
}

export class BasicCol {
   private readonly r: number;
   private readonly g: number;
   private readonly b: number;

   constructor(r: number, g: number, b: number) {
      this.r = r * 255/9;
      this.g = g * 255/9;
      this.b = b * 255/9;
   }

   public getCode(): string {
      return `rgb(${this.r}, ${this.g}, ${this.b})`;
   }
}

export class Colour {
   private static readonly HEX_DIGITS: ReadonlyArray<string> = [
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"
   ];

   private hex: string;
   public getHEX(): string {
      return this.hex;
   }
   public getHexCode(): string {
      return "#" + this.hex;
   }

   private rgb: [number, number, number];
   public getRGB(): [number, number, number] {
      return this.rgb;
   }
   public getRGBCode(): string {
      const [r, g, b] = this.rgb;
      return `rgb(${r}, ${g}, ${b})`;
   }

   constructor(colour: string | [number, number, number] ) {
      if (typeof colour === "string") {
         this.hex = colour.toLowerCase();
         // If the hex code includes a "#" at the start, remove it
         if (this.hex.length === 7) {
            this.hex = this.hex.substring(1, 7);
         }
   
         this.rgb = this.getRGBFromHex(this.hex);
      } else {
         this.rgb = colour;

         this.hex = this.getHexFromRGB(this.rgb);
      }
   }

   private getRGBFromHex(hex: string): [number, number, number] {
      const rgb: [number, number, number] = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
         const digit1 = Colour.HEX_DIGITS.indexOf(hex[i * 2]);
         const digit2 = Colour.HEX_DIGITS.indexOf(hex[i * 2 + 1]);
         rgb[i] = digit1 * 16 + digit2;
      }
      return rgb;
   }
   private getHexFromRGB(rgb: [number, number, number]): string {
      let hex = "";
      for (let i = 0; i < 3; i++) {
         const col = rgb[i];
         const digit2 = col % 16;
         const digit1 = (col-digit2) / 16;
         hex += Colour.HEX_DIGITS[digit1] + Colour.HEX_DIGITS[digit2];
      }
      return hex;
   }

   // public darken(amount: number): Colour {
   //    // 1 = fully darkened, 0.5 = half darkened
   //    // Rounds down
   //    const rgb = this.rgb.map(colour => Math.round(colour * (1 - amount))) as [number, number, number];
   //    return new Colour(rgb);
   // }

   // // https://stackoverflow.com/questions/13348129/using-native-javascript-to-desaturate-a-colour/13355255
   // public desaturate(amount: number): Colour {
   //    const col = this.rgb.slice();
   //    const gray = col[0] * 0.3086 + col[1] * 0.6094 + col[2] * 0.0820;

   //    col[0] = Math.round(lerp(col[0], gray, amount));
   //    col[1] = Math.round(lerp(col[1], gray, amount));
   //    col[2] = Math.round(lerp(col[2], gray, amount));

   //    return new Colour([col[0], col[1], col[2]]);
   // }

   // static grayscale(val: number): string {
   //    const b16 = Math.floor(val * 255);

   //    const hex = Colour.getHex([b16, b16, b16]);
   //    return hex;
   // }
}

export function ease(t: number, a: number): number {
   const tToA = Math.pow(t, a);
   return tToA / (tToA + Math.pow(1 - t, a));
}

export type ConstructorFunction = (abstract new (...args: any[]) => any) | (new (...args: any[]) => any);

export function roundNum(num: number, dp: number): number {
   const power = Math.pow(10, dp)
   return Math.round((num + Number.EPSILON) * power) / power;
}