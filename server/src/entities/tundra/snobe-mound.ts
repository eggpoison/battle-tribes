import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { SnobeMoundComponent } from "../../components/SnobeMoundComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createSnobeMoundConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 28), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(4);
   
   const snobeMoundComponent = new SnobeMoundComponent();
   
   return {
      entityType: EntityType.snobeMound,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.snobeMound]: snobeMoundComponent,
      },
      lights: []
   }
}