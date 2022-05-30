import Camera from "../Camera";
import { Point3, Vector3 } from "../utils";

type ParticleType = "rectangle" | "ellipse" | "image";

type ParticleInfo = {
   readonly type: ParticleType;
   readonly size: {
      readonly width: number;
      readonly height: number;
   } | number;
   readonly initialVelocity: Vector3;
   readonly initialAcceleration: Vector3;
   readonly angularVelocity: number;
}

interface ImageParticleInfo extends ParticleInfo {
   readonly type: "image";
   readonly size: {
      readonly width: number;
      readonly height: number;
   }
   readonly imageSrc: string;
}

interface RectangleParticleInfo extends ParticleInfo {
   readonly type: "rectangle";
   readonly size: {
      readonly width: number;
      readonly height: number;
   }
}

export type ParticleInfoType = ImageParticleInfo | RectangleParticleInfo;

class Particle {
   public readonly type: ParticleType;
   public readonly size: {
      readonly width: number;
      readonly height: number;
   } | number;
   public readonly colour?: string;

   public position: Point3;
   public velocity: Vector3;
   public acceleration: Vector3;

   constructor(initialPosition: Point3, info: ParticleInfoType) {
      this.type = info.type;
      this.size = info.size;

      this.position = initialPosition;
      this.velocity = info.initialVelocity;
      this.acceleration = info.initialAcceleration;
   }

   public tick(): void {
      this.position = this.position.add(this.velocity.convertToPoint());
   }

   public render(ctx: CanvasRenderingContext2D): void {
      switch (this.type) {
         case "rectangle": {
            const { width, height } = this.size as { width: number, height: number };

            const canvasX = Camera.getXPositionInCamera(this.position.x);
            const canvasY = Camera.getXPositionInCamera(this.position.z - this.position.y);

            ctx.fillStyle = this.colour!;

            ctx.fillRect(canvasX - width/2, canvasY - height/2, width, height);
         }
      }
   }
}

export default Particle;