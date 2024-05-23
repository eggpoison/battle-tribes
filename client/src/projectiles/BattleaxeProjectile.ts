import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "../Entity";
import Board from "../Board";
import { attachSoundToEntity, playSound } from "../sound";
import { EntityComponentsData } from "webgl-test-shared/dist/components";

class BattleaxeProjectile extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.battleaxeProjectile>) {
      super(position, id, EntityType.battleaxeProjectile, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("items/large/stone-battleaxe.png"),
            0,
            0
         )
      );

      this.playWhoosh();
   }

   public tick(): void {
      super.tick();

      if (Board.tickIntervalHasPassed(0.25)) {
         this.playWhoosh();
      }
   }

   private playWhoosh(): void {
      const soundInfo = playSound("air-whoosh.mp3", 0.25, 1, this.position.x, this.position.y);
      attachSoundToEntity(soundInfo.sound, this);
   }
}

export default BattleaxeProjectile;