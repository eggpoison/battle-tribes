import Board from "../Board";
import Camera from "../Camera";
import SETTINGS from "../settings";
import { lerp, Mutable, Point3, randFloat, Vector3 } from "../utils";

type ParticleType = "rectangle" | "ellipse" | "image";

type ParticleInfo = {
   readonly type: ParticleType;
   readonly size: {
      readonly width: number | [number, number];
      readonly height: number | [number, number];
   } | number | [number, number];
   readonly initialVelocity: Vector3 | (() => Vector3);
   /** By default, set to gravity */
   readonly initialAcceleration?: Vector3;
   /** Initial rotation of the particle in degrees */
   readonly initialRotation?: number;
   readonly angularVelocity?: number;
   readonly angularAcceleration?: number;
   readonly lifespan?: number | [number, number];
   /** How much the velocity decreases each second */
   readonly friction?: number;
   readonly endOpacity?: number;
}

interface ImageParticleInfo extends ParticleInfo {
   readonly type: "image";
   readonly imageSrc: string;
}

interface RectangleParticleInfo extends ParticleInfo {
   readonly type: "rectangle";
   readonly colour: [number, number, number];
   readonly endColour?: [number, number, number];
}

export type ParticleInfoType = ImageParticleInfo | RectangleParticleInfo;

class Particle {
   private static readonly GRAVITY: Vector3 = new Point3(0, 0, -4).convertToVector();

   private readonly type: ParticleType;
   private readonly size: {
      readonly width: number;
      readonly height: number;
   };
   private readonly colour?: [number, number, number];
   private readonly endColour?: [number, number, number];
   private readonly endOpacity?: number;
   
   private position: Point3;
   private velocity: Vector3;
   private acceleration: Vector3;

   private rotation: number;
   private angularVelocity: number;
   private angularAcceleration: number;

   private age: number = 0;
   private lifespan?: number;
   private friction?: number;

   constructor(initialPosition: Point3, info: ParticleInfoType) {
      this.type = info.type;

      // Initialise size
      const size: Mutable<Partial<typeof this.size>> = {};
      if (typeof info.size === "object" && !Array.isArray(info.size)) {
         // Object size
         if (typeof info.size.width === "object") {
            size.width = randFloat(info.size.width[0], info.size.width[1]);
         } else {
            size.width = info.size.width;
         }
         if (typeof info.size.height === "object") {
            size.height = randFloat(info.size.height[0], info.size.height[1]);
         } else {
            size.height = info.size.height;
         }
      } else if (typeof info.size === "object" && Array.isArray(info.size)) {
         // Array size
         const randomSize = randFloat(info.size[0], info.size[1]);
         size.width = randomSize;
         size.height = randomSize;
      } else {
         // Number size
         size.width = info.size;
         size.height = info.size;
      }
      this.size = size as { width: number, height: number };

      if (info.hasOwnProperty("colour")) this.colour = (info as RectangleParticleInfo).colour;
      if (info.hasOwnProperty("endColour")) this.endColour = (info as RectangleParticleInfo).endColour;

      if (typeof info.endOpacity !== "undefined") this.endOpacity = info.endOpacity;

      this.position = initialPosition;
      this.velocity = typeof info.initialVelocity === "function" ? info.initialVelocity() : info.initialVelocity;
      this.acceleration = typeof info.initialAcceleration !== "undefined" ? info.initialAcceleration : Particle.GRAVITY;

      this.rotation = typeof info.initialRotation !== "undefined" ? info.initialRotation : 0;
      this.angularVelocity = typeof info.angularVelocity !== "undefined" ? info.angularVelocity : 0;
      this.angularAcceleration = typeof info.angularAcceleration !== "undefined" ? info.angularAcceleration : 0;

      this.lifespan = typeof info.lifespan === "number" ? info.lifespan : randFloat(...(info.lifespan as [number, number]));
      this.friction = info.friction;

      Board.addParticle(this);
   }

   public tick(): void {
      // Decrement lifespan
      if (typeof this.lifespan !== "undefined") {
         this.age += 1 / SETTINGS.tps;

         if (this.age >= this.lifespan) {
            this.destroy();
            return;
         }
      }

      // Apply acceleration
      const acceleration = this.acceleration.copy();
      acceleration.radius /= SETTINGS.tps;
      this.velocity = this.velocity.add(acceleration);

      // Apply friction
      if (typeof this.friction !== "undefined") {
         // Move the x and y components towards 0
         const pointVelocity = this.velocity.convertToPoint();
         const xSign = pointVelocity.x > 0 ? 1 : -1;
         pointVelocity.x -= this.friction / SETTINGS.tps * xSign;
         const ySign = pointVelocity.y > 0 ? 1 : -1;
         pointVelocity.y -= this.friction / SETTINGS.tps * ySign;

         // Stop friction from slowing the particle down beyond a stop
         if (pointVelocity.x !== 0 && Math.sign(pointVelocity.x) !== xSign) {
            pointVelocity.x = 0;
         }
         if (pointVelocity.y !== 0 && Math.sign(pointVelocity.y) !== ySign) {
            pointVelocity.y = 0;
         }

         this.velocity = pointVelocity.convertToVector();
      }
      
      // Apply velocity
      const velocity = this.velocity.copy();
      velocity.radius *= Board.tileSize / SETTINGS.tps;
      this.position = this.position.add(this.velocity.convertToPoint());

      // Bounce when hitting the ground
      if (this.position.z < 0) {
         // Push the particle back above the ground
         this.position.z *= -1;

         // Flip the particle's velocity
         const flippedVelocity = this.velocity.convertToPoint();
         flippedVelocity.z *= -1;
         this.velocity = flippedVelocity.convertToVector();
      }

      // Apply angular acceleration
      this.angularVelocity += this.angularAcceleration;

      // Apply angular velocity
      this.rotation += this.angularVelocity;
   }

   public render(ctx: CanvasRenderingContext2D): void {
      switch (this.type) {
         case "rectangle": {
            const { width, height } = this.size as { width: number, height: number };

            const opacity = (typeof this.endOpacity !== "undefined" && typeof this.lifespan !== "undefined") ? 1 - this.age / this.lifespan : 1;

            // Draw shadow:

            // Rotate canvas
            ctx.translate(Camera.getXPositionInCamera(this.position.x), Camera.getYPositionInCamera(this.position.y));
            ctx.rotate(this.rotation);
            ctx.translate(-Camera.getXPositionInCamera(this.position.x), -Camera.getYPositionInCamera(this.position.y));

            const shadowCanvasX = Camera.getXPositionInCamera(this.position.x);
            const shadowCanvasY = Camera.getYPositionInCamera(this.position.y);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * opacity})`;
            ctx.fillRect(shadowCanvasX - width/2, shadowCanvasY - height/2, width, height);

            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // Draw particle:

            // Rotate canvas
            ctx.translate(Camera.getXPositionInCamera(this.position.x), Camera.getYPositionInCamera(this.position.y - this.position.z));
            ctx.rotate(this.rotation);
            ctx.translate(-Camera.getXPositionInCamera(this.position.x), -Camera.getYPositionInCamera(this.position.y - this.position.z));

            let r!: number;
            let g!: number;
            let b!: number;
            if (typeof this.lifespan !== "undefined" && typeof this.endColour !== "undefined") {
               const amount = this.age / this.lifespan;

               r = lerp(this.colour![0], this.endColour![0], amount);
               g = lerp(this.colour![1], this.endColour![1], amount);
               b = lerp(this.colour![2], this.endColour![2], amount);
            } else {
               r = this.colour![0];
               g = this.colour![1];
               b = this.colour![2];
            }

            const canvasX = Camera.getXPositionInCamera(this.position.x);
            const canvasY = Camera.getYPositionInCamera(this.position.y - this.position.z);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.fillRect(canvasX - width/2, canvasY - height/2, width, height);

            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
         }
      }
   }

   private destroy(): void {
      Board.removeParticle(this);
   }
}

export default Particle;