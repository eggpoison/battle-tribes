import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, angle } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityData, HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import { WALL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import Board from "../Board";

class Wall extends Entity {
   private static readonly NUM_DAMAGE_STAGES = 6;

   private damageRenderPart: RenderPart | null = null;

   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.wall);

      const buildingMaterialComponentData = componentDataRecord[ServerComponentType.buildingMaterial]!;
      const healthComponentData = componentDataRecord[ServerComponentType.health]!;
      
      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(WALL_TEXTURE_SOURCES[buildingMaterialComponentData.material]),
         0,
         0
      );
      renderPart.addTag("buildingMaterialComponent:material");
      this.attachRenderPart(renderPart);

      this.updateDamageRenderPart(healthComponentData.health, healthComponentData.maxHealth);

      // @Cleanup: why <= 1?
      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, Point.unpackage(transformComponentData.position));
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
         this.damageRenderPart = new RenderPart(
            this,
            getTextureArrayIndex(textureSource),
            1,
            0
         );
         this.attachRenderPart(this.damageRenderPart);
      } else {
         this.damageRenderPart.switchTextureSource(textureSource);
      }
   }
   public updateFromData(data: EntityData): void {
      super.updateFromData(data);

      const healthComponent = this.getServerComponent(ServerComponentType.health);
      this.updateDamageRenderPart(healthComponent.health, healthComponent.maxHealth);
   }

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
            const entity = Board.entityRecord[entityID]!;
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