import { HitboxCollisionType, updateBox } from "../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { BlockType, ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { getItemAttackInfo, InventoryName, ITEM_TYPE_RECORD } from "../../../shared/src/items/items";
import { Point } from "../../../shared/src/utils";
import { createEntityConfigAttachInfo, EntityConfig } from "../components";
import { BlockAttackComponent } from "../components/BlockAttackComponent";
import { getHeldItem, LimbInfo } from "../components/InventoryUseComponent";
import { setHitboxToLimbState } from "../components/SwingAttackComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { Hitbox } from "../hitboxes";

export function createBlockAttackConfig(owner: Entity, limb: LimbInfo): EntityConfig {
   const ownerTransformComponent = TransformComponentArray.getComponent(owner);
   const ownerHitbox = ownerTransformComponent.hitboxes[0];

   const transformComponent = new TransformComponent();

   const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   
   const heldItem = getHeldItem(limb);
   const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
   const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo!;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(new Point(0, 0), new Point(damageBoxInfo.offsetX * (isFlipped ? -1 : 1), damageBoxInfo.offsetY), damageBoxInfo.rotation * (isFlipped ? -1 : 1), damageBoxInfo.width, damageBoxInfo.height), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   setHitboxToLimbState(ownerTransformComponent, transformComponent, hitbox, limb.currentActionStartLimbState, isFlipped);
   // @hack ? Should probably set all hitbox positions when they are added from the join buffer.
   updateBox(hitbox.box, ownerHitbox.box);
   
   const blockType = heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "shield" ? BlockType.shieldBlock : BlockType.toolBlock;
   const blockAttackComponent = new BlockAttackComponent(owner, limb, blockType);

   return {
      entityType: EntityType.blockAttack,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.blockAttack]: blockAttackComponent
      },
      lights: [],
      attachInfo: createEntityConfigAttachInfo(hitbox, ownerHitbox, true)
   };
}