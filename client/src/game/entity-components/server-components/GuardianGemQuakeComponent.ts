import { randItem, PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createGemQuakeProjectile } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface GuardianGemQuakeComponentData {}

export interface GuardianGemQuakeComponent {}

const TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/guardian-gem-quake/gem-1.png",
   "entities/guardian-gem-quake/gem-2.png",
   "entities/guardian-gem-quake/gem-3.png"
];

class _GuardianGemQuakeComponentArray extends ServerComponentArray<GuardianGemQuakeComponent, GuardianGemQuakeComponentData> {
   public decodeData(reader: PacketReader): GuardianGemQuakeComponentData {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
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
         getTextureArrayIndex(randItem(TEXTURE_SOURCES))
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): GuardianGemQuakeComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onLoad(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (let i = 0; i < 2; i++) {
         createGemQuakeProjectile(transformComponent);
      }
   }
}

export const GuardianGemQuakeComponentArray = registerServerComponentArray(ServerComponentType.guardianGemQuake, _GuardianGemQuakeComponentArray, true);