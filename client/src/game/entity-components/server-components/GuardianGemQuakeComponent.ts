import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randItem } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createGemQuakeProjectile } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { Bytes } from "../../../../../shared/src/constants";
import { TextureIndex } from "../../../texture-index";

export interface GuardianGemQuakeComponentData {}

export interface GuardianGemQuakeComponent {}

const TEXTURE_INDEXES: readonly TextureIndex[] = [
   TextureIndex.entities_guardianGemQuake_gem1,
   TextureIndex.entities_guardianGemQuake_gem2,
   TextureIndex.entities_guardianGemQuake_gem3
];

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.guardianGemQuake, _GuardianGemQuakeComponentArray> {}
}

class _GuardianGemQuakeComponentArray extends ServerComponentArray<GuardianGemQuakeComponent, GuardianGemQuakeComponentData> {
   public decodeData(reader: PacketReader): GuardianGemQuakeComponentData {
      reader.padOffset(Bytes.Float32);
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
         randItem(TEXTURE_INDEXES)
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