import { angle, randFloat } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { HitData } from "battletribes-shared/client-server-types";
import { BloodParticleSize, createBlueBloodParticle, createBlueBloodParticleFountain, createBlueBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { FROZEN_YETI_HEAD_DISTANCE } from "../entity-components/FrozenYetiComponent";
import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";

class FrozenYeti extends Entity {
   private static readonly SIZE = 152;
   
   constructor(id: number) {
      super(id, EntityType.frozenYeti);

      this.attachRenderThing(new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/frozen-yeti/frozen-yeti.png")
      ));

      const headRenderPart = new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex("entities/frozen-yeti/frozen-yeti-head.png")
      );
      headRenderPart.addTag("frozenYetiComponent:head");
      headRenderPart.offset.y = FROZEN_YETI_HEAD_DISTANCE;
      this.attachRenderThing(headRenderPart);

      // Create paw render parts
      const pawRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const paw = new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/frozen-yeti/frozen-yeti-paw.png")
         );
         paw.addTag("frozenYetiComponent:paw");

         this.attachRenderThing(paw);
         pawRenderParts.push(paw);
      }
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Blood pool particle
      createBlueBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, FrozenYeti.SIZE / 2);
      
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + FrozenYeti.SIZE / 2 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + FrozenYeti.SIZE / 2 * Math.cos(offsetDirection);
         createBlueBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      
      for (let i = 0; i < 4; i++) {
         createBlueBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, FrozenYeti.SIZE / 2);
      }

      createBlueBloodParticleFountain(this, 0.15, 1.4);
   }
}

export default FrozenYeti;