import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, getItemAttackInfo, ItemType, Point, rotatePoint, createRectangularBox } from "battletribes-shared";
import { createEntityConfigAttachInfo, EntityConfig } from "../components.js";
import { HeldItemComponent } from "../components/HeldItemComponent.js";
import { StatusEffectComponent } from "../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { createHitbox, Hitbox } from "../hitboxes.js";

export function createHeldItemConfig(limbHitbox: Hitbox, itemType: ItemType): EntityConfig {
   const transformComponent = new TransformComponent();

   const statusEffectComponent = new StatusEffectComponent(0);

   const heldItemAttackInfo = getItemAttackInfo(itemType);
   const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo;

   const offset = new Point(damageBoxInfo.offsetX, damageBoxInfo.offsetY);
   const rotatedOffset = rotatePoint(offset, limbHitbox.box.angle);

   // @HACK SQUEAM: the collision mask, so that the player can mine berries for a horse archer shot
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(limbHitbox.box.posX + rotatedOffset.x, limbHitbox.box.posY + rotatedOffset.y, offset.x, offset.y, damageBoxInfo.rotation, damageBoxInfo.width, damageBoxInfo.height), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox);
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