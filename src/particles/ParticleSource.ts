import Board from "../Board";
import SETTINGS from "../settings";
import { Point, Point3 } from "../utils";
import Particle, { ParticleInfoType } from "./Particle";

interface ParticleSourceInfo {
   readonly spawnRate: number;
   readonly initialSpawnAmount: number;
   readonly position: Point;
   readonly particleInfo: ParticleInfoType;
}

class ParticleSource implements ParticleSourceInfo {
   readonly spawnRate: number;
   readonly initialSpawnAmount: number;
   readonly position: Point;
   readonly particleInfo: ParticleInfoType;

   private spawnTimer: number;
   
   constructor(info: ParticleSourceInfo) {
      this.spawnRate = info.spawnRate;
      this.initialSpawnAmount = info.initialSpawnAmount;
      this.position = info.position;
      this.particleInfo = info.particleInfo;

      this.spawnTimer = this.spawnRate;

      Board.addParticleSource(this);
   }

   public tick(): void {
      // console.log("m");
      this.spawnTimer -= 1 / SETTINGS.tps;

      while (this.spawnTimer <= 0) {
         this.spawnParticle();

         this.spawnTimer += this.spawnRate;
      }
   }

   private spawnParticle(): void {
      const position = new Point3(this.position.x, 0, this.position.y);

      const particle = new Particle(position, this.particleInfo);
      Board.addParticle(particle);
   }
}

export default ParticleSource;