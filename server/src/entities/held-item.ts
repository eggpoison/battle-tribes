import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { getItemAttackInfo, ItemType } from "../../../shared/src/items/items";
import { Point, rotatePoint } from "../../../shared/src/utils";
import { createEntityConfigAttachInfo, EntityConfig } from "../components";
import { HeldItemComponent } from "../components/HeldItemComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { Hitbox } from "../hitboxes";

export function createHeldItemConfig(limbHitbox: Hitbox, itemType: ItemType): EntityConfig {
   const transformComponent = new TransformComponent();

   const statusEffectComponent = new StatusEffectComponent(0);

   const heldItemAttackInfo = getItemAttackInfo(itemType);
   const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo;

   const offset = new Point(damageBoxInfo.offsetX, damageBoxInfo.offsetY);
   const heldItemPosition = limbHitbox.box.position.copy();
   heldItemPosition.add(rotatePoint(offset, limbHitbox.box.angle));

   // @HACK SQUEAM: the collision mask, so that the player can mine berries for a horse archer shot
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(heldItemPosition, offset, damageBoxInfo.rotation, damageBoxInfo.width, damageBoxInfo.height), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const heldItemComponent = new HeldItemComponent(itemType);

   return {
      entityType: EntityType.heldItem,
      components: [
         transformComponent,
         statusEffectComponent,
         heldItemComponent,
      ],
      lights: [],
      attachInfo: createEntityConfigAttachInfo(hitbox, limbHitbox, true)
   };
}