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
   if (arr.length === 0) throw new Error("Array has no items in it!");

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

interface PointInfo<P, V> {
   x: number;
   y: number;
   add(other: P): P;
   subtract(other: P): P;
   dot(other: P): number;
   distanceFrom(other: P): number;
   angleBetween(other: P): number;
   convertToVector(other?: P): V;
}

export class Point implements PointInfo<Point, Vector> {
   public x: number;
   public y: number;

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public add(other: Point): Point {
      return new Point(
         this.x + other.x,
         this.y + other.y
      );
   };

   public subtract(other: Point): Point {
      return new Point(
         this.x - other.x,
         this.y - other.y
      );
   }

   public dot(other: Point): number {
      return this.x * other.x + this.y * other.y;
   }

   public distanceFrom(other: Point): number {
      const distance = Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
      return distance;
   };

   public distanceFromRectangle(minX: number, maxX: number, minY: number, maxY: number): number {
      const dx = Math.max(minX - this.x, 0, this.x - maxX);
      const dy = Math.max(minY - this.y, 0, this.y - maxY);
      return Math.sqrt(dx*dx + dy*dy);
   }

   public angleBetween(other: Point): number {
      const angle = Math.atan2(other.y - this.y, other.x - this.x);
      return angle;
   }

   public convertToVector(other?: Point): Vector {
      const targetPoint = other || new Point(0, 0);

      const distance = this.distanceFrom(targetPoint);
      const angle = targetPoint.angleBetween(this);
      return new Vector(distance, angle);
   }
}

export class Point3 {
   public x: number;
   public y: number;
   public z: number;

   constructor(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
   }

   public add(other: Point3): Point3 {
      return new Point3(
         this.x + other.x,
         this.y + other.y,
         this.z + other.z
      );
   };

   public subtract(other: Point3): Point3 {
      return new Point3(
         this.x - other.x,
         this.y - other.y,
         this.z - other.z
      );
   }

   public dot(other: Point3): number {
      return this.x * other.x + this.y * other.y + this.z * other.z;
   }

   public distanceFrom(other: Point3): number {
      const distance = Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2) + Math.pow(this.z - other.z, 2));
      return distance;
   };

   // public angleBetween(other: Point3): number {
   //    const angle = Math.atan2(other.y - this.y, other.x - this.x);
   //    return angle;
   // }

   // public convertToVector(other?: Point3): Vector3 {
   //    const relativeMeasuringPoint = other || new Point3(0, 0, 0);

   //    const distance = this.distanceFrom(relativeMeasuringPoint);
   //    const angle = relativeMeasuringPoint.angleBetween(this);
   //    return new Vector3(distance, angle);
   // }
}

export function getRandomAngle() {
   return Math.random() * 360;
}

interface VectorType<V, P> {
   magnitude: number;
   direction: number;
   convertToPoint(): P;
   add(other: V): V;
   copy(): V;
}

export class Vector implements VectorType<Vector, Point> {
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

   public add(other: Vector): Vector {
      return (this.convertToPoint().add(other.convertToPoint())).convertToVector();
   }

   public copy(): Vector {
      return new Vector(this.magnitude, this.direction);
   }

   public static randomUnitVector(): Vector {
      const theta = randFloat(0, 360);
      return new Vector(1, theta);
   }
}

export class Vector3 {
   public magnitude: number;
   public yDirection: number;
   public zDirection: number;

   constructor(magnitude: number, yDirection: number, zDirection: number) {
      this.magnitude = magnitude;
      this.yDirection = yDirection;
      this.zDirection = zDirection;
   }

   public convertToPoint(): Point3 {
      const x = Math.cos(this.yDirection) * this.magnitude;
      const y = Math.sin(this.yDirection) * this.magnitude;
      const z = Math.cos(this.zDirection) * this.magnitude;
      return new Point3(x, y, z);
   }

   // public add(other: Vector3): Vector3 {
   //    return (this.convertToPoint().add(other.convertToPoint())).convertToVector();
   // }

   // public copy(): Vector3 {
   //    return new Vector3(this.magnitude, this.yDirection);
   // }

   public static randomUnitVector(): Vector3 {
      const yDirection = randFloat(0, 360);
      const zDirection = randFloat(0, 360);
      return new Vector3(1, yDirection, zDirection);
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
   private static readonly HEX_DIGITS: ReadonlyArray<string> = [
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"
   ];

   private r: number;
   private g: number;
   private b: number;

   constructor(r: number, g: number, b: number) {
      this.r = r * 255/9;
      this.g = g * 255/9;
      this.b = b * 255/9;
   }

   public static from(hexCode: string): BasicCol {
      // Split the hex code into characters
      const hex = hexCode.split("");

      // Remove the "#" at the start
      if (hex[0] === "#") hex.splice(0, 1);

      const rgb: [number, number, number] = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
         const digit1 = BasicCol.HEX_DIGITS.indexOf(hex[i * 2]);
         const digit2 = BasicCol.HEX_DIGITS.indexOf(hex[i * 2 + 1]);
         rgb[i] = (digit1 * 16 + digit2) / 255*9;
      }

      return new BasicCol(rgb[0], rgb[1], rgb[2]);
   }

   public getCode(): string {
      return `rgb(${this.r}, ${this.g}, ${this.b})`;
   }

   /**
    * @param amount How much to darken the colour. (0 = none, 1 = fully black)
    */
   public darken(amount: number): void {
      this.r *= 1 - amount;
      this.g *= 1 - amount;
      this.b *= 1 - amount;
   }
}

export class Colour {
   private static readonly HEX_DIGITS: { [key: string]: number } = {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "a": 10,
      "b": 11,
      "c": 12,
      "d": 13,
      "e": 14,
      "f": 15
   };

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

   constructor(colour: string) {
      this.hex = colour.toLowerCase();
      // If the hex code includes a "#" at the start, remove it
      if (this.hex.length === 7) {
         this.hex = this.hex.substring(1, 7);
      }

      this.rgb = this.getRGBFromHex(this.hex);
   }

   private getRGBFromHex(hex: string): [number, number, number] {
      const rgb: [number, number, number] = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
         const digit1 = Colour.HEX_DIGITS[hex[i * 2]];
         const digit2 = Colour.HEX_DIGITS[hex[i * 2 + 1]];
         rgb[i] = digit1 * 16 + digit2;
      }
      return rgb;
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

let isInFocus = true;

export function setWindowFocus(newFocus: boolean): void {
   isInFocus = newFocus;
}

export function gameIsInFocus(): boolean {
   return isInFocus;
}

window.addEventListener("focus", () => {
   isInFocus = true;
});
window.addEventListener("blur", () => {
   isInFocus = false;
});