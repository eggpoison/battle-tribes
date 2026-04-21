import { ServerComponentType, Entity, Settings, PacketReader } from "webgl-test-shared";
import { createPoisonParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface SlimeSpitComponentData {}

export interface SlimeSpitComponent {}

class _SlimeSpitComponentArray extends ServerComponentArray<SlimeSpitComponent, SlimeSpitComponentData> {
   public decodeData(reader: PacketReader): SlimeSpitComponentData {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const renderPart1 = new TexturedRenderPart(
         hitbox,
         1,
         0,
         0, 0,
         getTextureArrayIndex("projectiles/slime-spit-medium.png")
      );
      renderPart1.opacity = 0.75;
      renderObject.attachRenderPart(renderPart1);

      const renderPart2 = new TexturedRenderPart(
         hitbox,
         0,
         Math.PI/4,
         0, 0,
         getTextureArrayIndex("projectiles/slime-spit-medium.png")
      );
      renderPart2.opacity = 0.75;
      renderObject.attachRenderPart(renderPart2);
   }

   public createComponent(): SlimeSpitComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 2;
   }

   public onLoad(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("slime-spit.mp3", 0.5, 1, entity, hitbox, false);
   }

   public onTick(entity: Entity): void {
      const renderObject = getEntityRenderObject(entity);
      const rotatingRenderPart = renderObject.renderPartsByZIndex[0];
      
      rotatingRenderPart.angle += 1.5 * Math.PI * Settings.DT_S;

      if (tickIntervalHasPassed(0.2 * Settings.TICK_RATE)) {
         for (let i = 0; i < 5; i++) {
            createPoisonParticle(entity);
         }
      }
   }

   public onDie(entity: Entity): void {
      for (let i = 0; i < 15; i++) {
         createPoisonParticle(entity);
      }
   }
}

export const SlimeSpitComponentArray = registerServerComponentArray(ServerComponentType.slimeSpit, _SlimeSpitComponentArray, true);