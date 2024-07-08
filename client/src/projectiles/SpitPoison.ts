import Entity from "../Entity";
import Board from "../Board";
import { ParticleRenderLayer, addTexturedParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import Particle from "../Particle";
import { createPoisonBubble } from "../particles";
import { Sound, playSound } from "../sound";
import { Point, lerp, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

// @Cleanup: move to particles file
const createParticle = (spawnPositionX: number, spawnPositionY: number): void => {
   const lifetime = randFloat(0.5, 0.7);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   const purp = Math.random() / 4;

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      5 * 8 + 0,
      // 0, randFloat(-0.2, 0.2), 0
      lerp(0, 1, purp), lerp(randFloat(-0.2, 0.2), -1, purp), lerp(0, 1, purp)
   );
   Board.lowTexturedParticles.push(particle);
}

class SpitPoison extends Entity {
   private static readonly MAX_RANGE = 55;

   private readonly trackSource: AudioBufferSourceNode;
   private readonly sound: Sound;
   
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.spitPoison, ageTicks);

      const audioInfo = playSound("acid-burn.mp3", 0.25, 1, this.position.x, this.position.y);
      this.trackSource = audioInfo.trackSource;
      this.sound = audioInfo.sound;

      this.trackSource.loop = true;
   }

   public tick(): void {
      const hitbox = this.hitboxes[0] as CircularHitbox;
      const range = hitbox.radius;

      this.sound.volume = lerp(0.25, 0, 1 - range / SpitPoison.MAX_RANGE);

      if (SpitPoison.MAX_RANGE * Math.random() < range) {
         // Calculate spawn position
         const offsetMagnitude = range * Math.random();
         const moveDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + offsetMagnitude * Math.sin(moveDirection);
         const spawnPositionY = this.position.y + offsetMagnitude * Math.cos(moveDirection);

         createPoisonBubble(spawnPositionX, spawnPositionY, 1);
      }

      if (Math.random() >= range * range / Settings.TPS / 5) {
         return;
      }

      const offsetMagnitude = range * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = this.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = this.position.y + offsetMagnitude * Math.cos(offsetDirection);

      createParticle(x, y);
   }

   public onRemove(): void {
      this.trackSource.disconnect();
   }
}

export default SpitPoison;