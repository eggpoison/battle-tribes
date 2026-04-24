import { randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TumbleweedDeadComponentData {}

export interface TumbleweedDeadComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tumbleweedDead, _TumbleweedDeadComponentArray> {}
}

class _TumbleweedDeadComponentArray extends _ServerComponentArray<TumbleweedDeadComponent, TumbleweedDeadComponentData> {
   public decodeData(): TumbleweedDeadComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/tumbleweed-dead/tumbleweed-dead.png")
      );
      renderPart.tintR = randFloat(-0.03, 0.03);
      renderPart.tintG = randFloat(-0.03, 0.03);
      renderPart.tintB = randFloat(-0.03, 0.03);
      renderObject.attachRenderPart(renderPart)
   }

   public createComponent(): TumbleweedDeadComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
   }
}

export const TumbleweedDeadComponentArray = registerServerComponentArray(ServerComponentType.tumbleweedDead, _TumbleweedDeadComponentArray, true);