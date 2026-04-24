import { randFloat, PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface DesertBushSandyComponentData {
   readonly size: number;
}

export interface DesertBushSandyComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.desertBushSandy, _DesertBushSandyComponentArray> {}
}

class _DesertBushSandyComponentArray extends _ServerComponentArray<DesertBushSandyComponent, DesertBushSandyComponentData> {
   public decodeData(reader: PacketReader): DesertBushSandyComponentData {
      const size = reader.readNumber();
      return {
         size: size
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const desertBushSandyComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.desertBushSandy);
      
      let textureSource: string;
      if (desertBushSandyComponentData.size === 0) {
         textureSource = "entities/desert-bush-sandy/desert-bush-sandy.png";
      } else {
         textureSource = "entities/desert-bush-sandy/desert-bush-sandy-large.png";
      }
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(textureSource)
      );
      renderPart.tintR = randFloat(-0.02, 0.02);
      renderPart.tintG = randFloat(-0.02, 0.02);
      renderPart.tintB = randFloat(-0.02, 0.02);
      renderObject.attachRenderPart(renderPart)
   }

   public createComponent(): DesertBushSandyComponent {
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

export const DesertBushSandyComponentArray = registerServerComponentArray(ServerComponentType.desertBushSandy, _DesertBushSandyComponentArray, true);