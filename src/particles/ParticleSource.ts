import Board from "../Board";
import SETTINGS from "../settings";
import { Point, Point3 } from "../utils";
import Particle, { ParticleInfoType } from "./Particle";

export interface ParticleSourceInfo {
   readonly spawnRate: number;
   readonly initialSpawnAmount: number;
   readonly position: Point | (() => Point);
   readonly particleInfo: ParticleInfoType;
}

class ParticleSource implements ParticleSourceInfo {
   readonly spawnRate: number;
   readonly initialSpawnAmount: number;
   position: Point;
   readonly getPosition?: () => Point;
   readonly particleInfo: ParticleInfoType;

   private spawnTimer: number;
   
   constructor(info: ParticleSourceInfo) {
      this.spawnRate = info.spawnRate;
      this.initialSpawnAmount = info.initialSpawnAmount;
      this.position = typeof info.position === "function" ? info.position() : info.position;
      this.getPosition = typeof info.position === "function" ? info.position : undefined;
      this.particleInfo = info.particleInfo;

      this.spawnTimer = this.spawnRate;

      Board.addParticleSource(this);
   }

   public tick(): void {
      this.spawnTimer -= 1 / SETTINGS.tps;

      while (this.spawnTimer <= 0) {
         this.spawnParticle();

         this.spawnTimer += this.spawnRate;
      }
   }

   private spawnParticle(): void {
      // Update position
      if (typeof this.getPosition !== "undefined") {
         this.position = this.getPosition();
      }

      const position = new Point3(this.position.x, this.position.y, 0);

      const particle = new Particle(position, this.particleInfo);
      Board.addParticle(particle);
   }

   public destroy(): void {
      Board.removeParticleSource(this);
   }
}

export default ParticleSource;