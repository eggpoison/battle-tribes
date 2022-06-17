import Board from "../Board";
import Camera from "../Camera";
import { getGameCanvasContext } from "../components/Canvas";
import Entity, { ParticleRenderLayer } from "../entities/Entity";
import HitboxComponent from "../entity-components/HitboxComponent";
import TransformComponent from "../entity-components/TransformComponent";
import SETTINGS from "../settings";
import { lerp, Mutable, Point3, randFloat, Vector3 } from "../utils";

type ParticleType = "rectangle" | "ellipse" | "image";

type ParticleInfo = {
   readonly type: ParticleType;
   readonly size: {
      readonly width: number | [number, number];
      readonly height: number | [number, number];
   } | number | [number, number];
   readonly endSize?: {
      readonly width: number | [number, number];
      readonly height: number | [number, number];
   } | number | [number, number];
   readonly renderLayer: ParticleRenderLayer;
   readonly initialOffset?: Point3 | (() => Point3);
   readonly initialVelocity: Vector3 | (() => Vector3);
   /** By default, set to gravity */
   readonly initialAcceleration?: Vector3;
   /** Initial rotation of the particle in degrees */
   readonly initialRotation?: number;
   readonly angularVelocity?: number;
   readonly angularAcceleration?: number;
   readonly lifespan: number | [number, number];
   /** How much the velocity decreases each second */
   readonly groundFriction?: number;
   readonly yFriction?: number;
   readonly startOpacity?: number;
   readonly endOpacity?: number;
   readonly shadowOpacity?: number;
   readonly hasShadow?: boolean;
   readonly doesBounce?: boolean;
   onDestroy?(): void;
   duringCollision?(entity: Entity, particle: Particle): void;
}

interface ImageParticleInfo extends ParticleInfo {
   readonly type: "image";
   readonly image: HTMLImageElement;
   readonly imageSrc: string;
}

interface RectangleParticleInfo extends ParticleInfo {
   readonly type: "rectangle";
   readonly colour: [number, number, number] | (() => [number, number, number]);
   readonly endColour?: [number, number, number];
}

export type ParticleInfoType = ImageParticleInfo | RectangleParticleInfo;

const IMAGE_SHADOWS: { [key: string]: HTMLImageElement } = {};

/**
 * Makes an image darker for use as a shadow
 */
const generateImageShadow = (imageSrc: string, image: HTMLImageElement): HTMLImageElement => {
   if (IMAGE_SHADOWS.hasOwnProperty(imageSrc)) {
      // If the shadow has already been generated, return that generated shadow
      return IMAGE_SHADOWS[imageSrc];
   } else {
      // Otherwise create the shadow

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, image.width, image.height);

      // Make all pixels black
      for (let px = 0; px < imageData.width * imageData.height * 4; px += 4) {
         imageData.data[px] = 0;
         imageData.data[px + 1] = 0;
         imageData.data[px + 2] = 0;
      }

      ctx.putImageData(imageData, 0, 0);

      // Create an image from the data
      const shadowImage = new Image();
      shadowImage.src = canvas.toDataURL();

      // Add the shadow image to the record
      IMAGE_SHADOWS[imageSrc] = shadowImage;

      return shadowImage;
   }
}

class Particle {
   private static readonly GRAVITY: Vector3 = new Point3(0, 0, -4).convertToVector();

   private readonly type: ParticleType;
   private readonly size: {
      readonly width: number;
      readonly height: number;
   };
   readonly endSize?: {
      readonly width: number;
      readonly height: number;
   };
   readonly renderLayer: ParticleRenderLayer;
   private readonly colour?: [number, number, number];
   private readonly endColour?: [number, number, number];
   private readonly startOpacity: number;
   private readonly endOpacity?: number;
   private readonly shadowOpacity: number;
   private readonly hasShadow: boolean;
   private readonly doesBounce: boolean;

   private readonly groundFriction?: number;
   private readonly yFriction?: number;

   private onDestroy?(): void;
   private duringCollision?(entity: Entity, particle: Particle): void;

   private readonly image?: HTMLImageElement;
   private readonly imageShadow?: HTMLImageElement;
   
   public position: Point3;
   private velocity: Vector3;
   private acceleration: Vector3;

   private rotation: number;
   private angularVelocity: number;
   private angularAcceleration: number;

   private age: number = 0;
   private readonly lifespan: number;

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
      
      // End size
      if (typeof info.endSize !== "undefined") {
         const endSize: Mutable<Partial<typeof this.endSize>> = {};
         if (typeof info.endSize === "object" && !Array.isArray(info.endSize)) {
            // Object endSize
            if (typeof info.endSize.width === "object") {
               endSize.width = randFloat(info.endSize.width[0], info.endSize.width[1]);
            } else {
               endSize.width = info.endSize.width;
            }
            if (typeof info.endSize.height === "object") {
               endSize.height = randFloat(info.endSize.height[0], info.endSize.height[1]);
            } else {
               endSize.height = info.endSize.height;
            }
         } else if (typeof info.endSize === "object" && Array.isArray(info.endSize)) {
            // Array endSize
            const randomSize = randFloat(info.endSize[0], info.endSize[1]);
            endSize.width = randomSize;
            endSize.height = randomSize;
         } else {
            // Number endSize
            endSize.width = info.endSize;
            endSize.height = info.endSize;
         }
         this.endSize = endSize as { width: number, height: number }
      }

      this.renderLayer = info.renderLayer;

      switch (info.type) {
         case "rectangle": {
            // Colour
            this.colour = (typeof info.colour === "function") ? info.colour() : info.colour;
            // End colour
            this.endColour = info.endColour;
            break;
         }
         case "image": {
            this.imageShadow = generateImageShadow(info.imageSrc, info.image);
            break;
         }
      }

      // Opacity
      this.startOpacity = info.startOpacity || 1;
      this.endOpacity = info.endOpacity;

      if (info.type === "image") this.image = info.image;

      this.shadowOpacity = typeof info.shadowOpacity !== "undefined" ? info.shadowOpacity : 1;

      this.position = initialPosition;
      if (typeof info.initialOffset !== "undefined") this.position = this.position.add(typeof info.initialOffset === "function" ? info.initialOffset() : info.initialOffset);
      this.velocity = typeof info.initialVelocity === "function" ? info.initialVelocity() : info.initialVelocity;
      this.acceleration = typeof info.initialAcceleration !== "undefined" ? info.initialAcceleration : Particle.GRAVITY;

      this.rotation = typeof info.initialRotation !== "undefined" ? info.initialRotation : 0;
      this.angularVelocity = typeof info.angularVelocity !== "undefined" ? info.angularVelocity : 0;
      this.angularAcceleration = typeof info.angularAcceleration !== "undefined" ? info.angularAcceleration : 0;

      // Lifespan
      this.lifespan = typeof info.lifespan === "number" ? info.lifespan : randFloat(...(info.lifespan as [number, number]));

      this.groundFriction = info.groundFriction;
      this.yFriction = info.yFriction;

      this.hasShadow = typeof info.hasShadow !== "undefined" ? info.hasShadow : true;

      this.doesBounce = typeof info.doesBounce !== "undefined" ? info.doesBounce : true;

      this.onDestroy = info.onDestroy;
      this.duringCollision = info.duringCollision;

      Board.addParticle(this);
   }

   public tick(): void {
      // Decrement lifespan
      this.age += 1 / SETTINGS.tps;

      if (this.age >= this.lifespan) {
         this.destroy();
         return;
      }

      // Apply acceleration
      const acceleration = this.acceleration.copy();
      acceleration.radius /= SETTINGS.tps;
      this.velocity = this.velocity.add(acceleration);

      // Apply friction
      if (typeof this.groundFriction !== "undefined") {
         // Move the x and y components towards 0
         const pointVelocity = this.velocity.convertToPoint();
         const xSign = pointVelocity.x > 0 ? 1 : -1;
         pointVelocity.x -= this.groundFriction / SETTINGS.tps * xSign;
         const ySign = pointVelocity.y > 0 ? 1 : -1;
         pointVelocity.y -= this.groundFriction / SETTINGS.tps * ySign;

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
      if (this.doesBounce && this.position.z < 0) {
         // Push the particle back above the ground
         this.position.z *= -1;

         // Flip the particle's velocity
         const flippedVelocity = this.velocity.convertToPoint();
         flippedVelocity.z *= -1;
         flippedVelocity.z -= this.yFriction || 0;
         this.velocity = flippedVelocity.convertToVector();
      }

      // Apply angular acceleration
      this.angularVelocity += this.angularAcceleration;

      // Apply angular velocity
      this.rotation += this.angularVelocity;

      // Run collision functions
      if (typeof this.duringCollision !== "undefined") {
         const radius = (this.size.width + this.size.height) / 2;
         const nearbyEntities = Board.getEntitiesInRange(this.position.convertTo2D(), radius);

         for (const entity of nearbyEntities) {
            const hitboxInfo = entity.getComponent(HitboxComponent)!.hitboxInfo;

            let approximateEntityRadius: number;
            switch (hitboxInfo.type) {
               case "circle": {
                  approximateEntityRadius = hitboxInfo.radius;
                  break;
               }
               case "rectangle": {
                  approximateEntityRadius = (hitboxInfo.width + hitboxInfo.height) / 2;
                  break;
               }
            }

            // Check if they are close enough in the z axis
            const entityPosition = entity.getComponent(TransformComponent)!.position.convertTo3D();
            const distance3D = this.position.distanceFrom(entityPosition);

            if (distance3D - approximateEntityRadius * Board.tileSize <= radius) {
               this.duringCollision(entity, this);
            }
         }
      }
   }

   private isVisible(): boolean {
      if (this.doesBounce) return true;

      return this.position.z + this.size.height/2 >= 0;
   }

   public render(): void {
      if (!this.isVisible()) return;

      const ctx = getGameCanvasContext();

      const opacity = (typeof this.endOpacity !== "undefined") ? lerp(this.startOpacity, this.endOpacity, this.age / this.lifespan) : this.startOpacity;

      switch (this.type) {
         case "rectangle": {
            let { width, height } = this.size;

            if (typeof this.endSize !== "undefined") {
               width = lerp(width, this.endSize.width, this.age / this.lifespan);
               height = lerp(height, this.endSize.height, this.age / this.lifespan);
            }

            // Rotate canvas
            ctx.translate(Camera.getXPositionInCamera(this.position.x), Camera.getYPositionInCamera(this.position.y - this.position.z));
            ctx.rotate(this.rotation / 180 * Math.PI);
            ctx.translate(-Camera.getXPositionInCamera(this.position.x), -Camera.getYPositionInCamera(this.position.y - this.position.z));

            let r!: number;
            let g!: number;
            let b!: number;
            if (typeof this.endColour !== "undefined") {
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

            break;
         }
         case "image": {
            const canvasX = Camera.getXPositionInCamera(this.position.x - this.size.width / 2);
            const canvasY = Camera.getYPositionInCamera((this.position.y - this.position.z) - this.size.height / 2);

            ctx.globalAlpha = opacity;

            ctx.drawImage(this.image!, canvasX, canvasY, this.size.width, this.size.height);

            ctx.globalAlpha = 1;

            break;
         }
      }
   }

   public renderShadow(): void {
      if (!this.hasShadow || !this.isVisible()) return;

      const ctx = getGameCanvasContext();

      let opacity = (typeof this.endOpacity !== "undefined") ? lerp(this.startOpacity, this.endOpacity, this.age / this.lifespan) : this.startOpacity;
      opacity *= this.shadowOpacity;

      switch (this.type) {
         case "rectangle": {
            let { width, height } = this.size;

            if (typeof this.endSize !== "undefined") {
               width = lerp(width, this.endSize.width, this.age / this.lifespan);
               height = lerp(height, this.endSize.height, this.age / this.lifespan);
            }

            // Rotate canvas
            ctx.translate(Camera.getXPositionInCamera(this.position.x), Camera.getYPositionInCamera(this.position.y));
            ctx.rotate(this.rotation / 180 * Math.PI);
            ctx.translate(-Camera.getXPositionInCamera(this.position.x), -Camera.getYPositionInCamera(this.position.y));

            const shadowCanvasX = Camera.getXPositionInCamera(this.position.x);
            const shadowCanvasY = Camera.getYPositionInCamera(this.position.y);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * opacity})`;
            ctx.fillRect(shadowCanvasX - width/2, shadowCanvasY - height/2, width, height);

            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            break;
         }
         case "image": {
            const canvasX = Camera.getXPositionInCamera(this.position.x - this.size.width / 2);
            const canvasY = Camera.getYPositionInCamera((this.position.y) - this.size.height / 2);

            ctx.globalAlpha = opacity;

            ctx.drawImage(this.imageShadow!, canvasX, canvasY, this.size.width, this.size.height);

            ctx.globalAlpha = 1;

            break;
         }
      }
   }

   public destroy(): void {
      Board.removeParticle(this);

      if (typeof this.onDestroy !== "undefined") {
         this.onDestroy();
      }
   }
}

export default Particle;