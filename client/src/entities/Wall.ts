import { EntityType } from "battletribes-shared/entities";
import { angle } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { HitData } from "battletribes-shared/client-server-types";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import { WALL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import Board from "../Board";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Wall extends Entity {
   private static readonly NUM_DAMAGE_STAGES = 6;

   private damageRenderPart: TexturedRenderPart | null = null;

   constructor(id: number) {
      super(id, EntityType.wall);
   }

   public onLoad(): void {
      const buildingMaterialComponent = this.getServerComponent(ServerComponentType.buildingMaterial);
      const healthComponentData = this.getServerComponent(ServerComponentType.health);
      
      const renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(WALL_TEXTURE_SOURCES[buildingMaterialComponent.material])
      );
      renderPart.addTag("buildingMaterialComponent:material");
      this.attachRenderThing(renderPart);

      this.updateDamageRenderPart(healthComponentData.health, healthComponentData.maxHealth);

      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
      }
   }

   private updateDamageRenderPart(health: number, maxHealth: number): void {
      let damageStage = Math.ceil((1 - health / maxHealth) * Wall.NUM_DAMAGE_STAGES);
      if (damageStage === 0) {
         if (this.damageRenderPart !== null) {
            this.removeRenderPart(this.damageRenderPart);
            this.damageRenderPart = null;
         }
         return;
      }
      // @Temporary: this is only here due to a bug which lets health go negative when attacking 25 health wooden wall with deepfrost axe (8 damage). remove when that bug is fixed
      if (damageStage > Wall.NUM_DAMAGE_STAGES) {
         damageStage = Wall.NUM_DAMAGE_STAGES;
      }
      
      const textureSource = "entities/wall/wooden-wall-damage-" + damageStage + ".png";
      if (this.damageRenderPart === null) {
         this.damageRenderPart = new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex(textureSource)
         );
         this.attachRenderThing(this.damageRenderPart);
      } else {
         this.damageRenderPart.switchTextureSource(textureSource);
      }
   }

   // public updateFromData(data: EntityData): void {
   //    super.updateFromData(data);

   //    const healthComponent = this.getServerComponent(ServerComponentType.health);
   //    this.updateDamageRenderPart(healthComponent.health, healthComponent.maxHealth);
   // }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      playSound("wooden-wall-hit.mp3", 0.3, 1, transformComponent.position);

      for (let i = 0; i < 6; i++) {
         createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32);
      }

      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
         createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
      }
   }
   
   // @Incomplete: doesn't play when removed by deconstruction
   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // @Speed @Hack
      // Don't play death effects if the wall was replaced by a blueprint
      for (const chunk of transformComponent.chunks) {
         for (const entityID of chunk.entities) {
            const entity = getEntityByID(entityID)!;
            if (entity.type !== EntityType.blueprintEntity) {
               continue;
            }

            const entityTransformComponent = entity.getServerComponent(ServerComponentType.transform);

            const dist = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
            if (dist < 1) {
               return;
            }
         }
      }

      playSound("wooden-wall-break.mp3", 0.4, 1, transformComponent.position);

      for (let i = 0; i < 16; i++) {
         createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 8; i++) {
         createWoodShardParticle(transformComponent.position.x, transformComponent.position.y, 32);
      }
   }
}

export default Wall;