import { lerp, Point, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity, { ComponentDataRecord } from "../Entity";
import Board from "../Board";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import Particle from "../Particle";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";

const POISON_COLOUR_LOW = [34/255, 12/255, 0];
const POISON_COLOUR_HIGH = [77/255, 173/255, 38/255];

class SlimeSpit extends Entity {
   private readonly renderParts: ReadonlyArray<RenderPart>;
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.slimeSpit);

      const renderParts = new Array<RenderPart>();

      // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

      const renderPart1 = new TexturedRenderPart(
         this,
         1,
         0,
         getTextureArrayIndex("projectiles/slime-spit-medium.png")
      );
      renderPart1.opacity = 0.75;
      this.attachRenderPart(renderPart1);
      renderParts.push(renderPart1);

      const renderPart2 = new TexturedRenderPart(
         this,
         0,
         Math.PI/4,
         getTextureArrayIndex("projectiles/slime-spit-medium.png")
      );
      renderPart2.opacity = 0.75;
      this.attachRenderPart(renderPart2);
      renderParts.push(renderPart2);

      this.renderParts = renderParts;

      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("slime-spit.mp3", 0.5, 1, Point.unpackage(transformComponentData.position));
      }
   }

   public tick(): void {
      super.tick();

      this.renderParts[0].rotation += 1.5 * Math.PI / Settings.TPS;
      this.renderParts[1].rotation -= 1.5 * Math.PI / Settings.TPS;

      if (Board.tickIntervalHasPassed(0.2)) {
         for (let i = 0; i < 5; i++) {
            this.createPoisonParticle();
         }
      }
   }

   public onDie(): void {
      for (let i = 0; i < 15; i++) {
         this.createPoisonParticle();
      }
   }

   private createPoisonParticle(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Calculate spawn position
      const offsetMagnitude = 20 * Math.random();
      const moveDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(moveDirection);
      const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(moveDirection);

      const lifetime = randFloat(0.2, 0.3);
      
      const pixelSize = 4;
   
      const moveSpeed = randFloat(75, 150);
      const velocityX = moveSpeed * Math.sin(moveDirection);
      const velocityY = moveSpeed * Math.cos(moveDirection);
   
      const particle = new Particle(lifetime);
      particle.getOpacity = (): number => {
         return 1 - particle.age / lifetime;
      };
   
      const colourLerp = Math.random();
      const r = lerp(POISON_COLOUR_LOW[0], POISON_COLOUR_HIGH[0], colourLerp);
      const g = lerp(POISON_COLOUR_LOW[1], POISON_COLOUR_HIGH[1], colourLerp);
      const b = lerp(POISON_COLOUR_LOW[2], POISON_COLOUR_HIGH[2], colourLerp);
   
      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         pixelSize, pixelSize,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         0,
         2 * Math.PI * Math.random(),
         0,
         0,
         0,
         r, g, b
      );
      Board.lowMonocolourParticles.push(particle);
   }
}

export default SlimeSpit;