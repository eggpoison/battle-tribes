import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";
import HealthComponent from "../entity-components/HealthComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import TribeComponent from "../entity-components/TribeComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import Entity from "../Entity";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.barrel>) {
      super(position, id, EntityType.barrel, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/barrel/barrel.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[3]));

      if (ageTicks === 0) {
         playSound("barrel-place.mp3", 0.4, 1, this.position.x, this.position.y);
      }
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Barrel;