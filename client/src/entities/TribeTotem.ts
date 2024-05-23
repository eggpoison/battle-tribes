import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";
import TribeComponent from "../entity-components/TribeComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TotemBannerComponent from "../entity-components/TotemBannerComponent";
import Entity from "../Entity";
import StructureComponent from "../entity-components/StructureComponent";

class TribeTotem extends Entity {
   public static readonly SIZE = 120;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeTotem>) {
      super(position, id, EntityType.tribeTotem, ageTicks);

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/tribe-totem/tribe-totem.png`),
         1,
         0
      );
      this.attachRenderPart(renderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]))
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]))
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]))
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]))
      this.addServerComponent(ServerComponentType.totemBanner, new TotemBannerComponent(this, componentsData[4]));
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default TribeTotem;