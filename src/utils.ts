export function randFloat(min: number, max: number): number {
   return Math.random() * (max - min) + min;
}

export function randItem<T>(arr: Array<T>): T {
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

   public dot(point2: Point): number {
      return this.x * point2.x + this.y * point2.y;
   }

   public distanceFrom(point2: Point): number {
      const distance = Math.sqrt(Math.pow(this.x - point2.x, 2) + Math.pow(this.y - point2.y, 2));
      return distance;
   };

   public angleBetween(point2: Point): number {
      const angle = Math.atan2(point2.y - this.y, point2.x - this.x);
      return angle;
   }

   public convertToVector(point2?: Point): Vector {
      const targetPoint = point2 || new Point(0, 0);

      const distance = this.distanceFrom(targetPoint);
      const angle = this.angleBetween(targetPoint);
      return new Vector(distance, angle);
   }
}

export class Vector {
   magnitude: number;
   direction: number;

   constructor(magnitude: number, direction: number) {
      this.magnitude = magnitude;
      this.direction = direction;
   }

   convertToPoint(): Point {
      const x = Math.cos(this.direction) * this.magnitude;
      const y = Math.sin(this.direction) * this.magnitude;
      return new Point(x, y);
   }

   static randomUnitVector(): Vector {
      const theta = randFloat(0, 360);
      return new Vector(1, theta);
   }
}

export function lerp(start: number, end: number, amount: number): number {
   return start * (1 - amount) + end * amount;
}