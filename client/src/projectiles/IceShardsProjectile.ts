import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "../Entity";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import PhysicsComponent from "../entity-components/PhysicsComponent";

class IceShardsProjectile extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.iceShardProjectile>) {
      super(position, id, EntityType.iceShardProjectile, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("projectiles/ice-shard.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
   }
}

export default IceShardsProjectile;