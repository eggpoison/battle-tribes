import { HitboxCollisionType, updateBox } from "../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { getItemAttackInfo, InventoryName } from "../../../shared/src/items/items";
import { Point, rotatePoint } from "../../../shared/src/utils";
import { createEntityConfigAttachInfo, EntityConfig } from "../components";
import { getHeldItem, LimbInfo } from "../components/InventoryUseComponent";
// import { setHitboxToLimbState, SwingAttackComponent } from "../components/SwingAttackComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { Hitbox } from "../hitboxes";

// export function createSwingAttackConfig(position: Point, angle: number, owner: Entity, limb: LimbInfo): EntityConfig {
//    const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   
//    const ownerTransformComponent = TransformComponentArray.getComponent(owner);
//    const ownerHitbox = ownerTransformComponent.hitboxes[0];
   
//    const heldItem = getHeldItem(limb);
//    const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
//    const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo;
   
//    const transformComponent = new TransformComponent();


//    setHitboxToLimbState(ownerTransformComponent, transformComponent, limbHitbox, limb.currentActionStartLimbState, isFlipped);
//    // @hack ? Should probably set all hitbox positions when they are added from the join buffer.
//    updateBox(limbHitbox.box, ownerHitbox.box);

//    if (damageBoxInfo !== null) {
//       const offset = new Point(damageBoxInfo.offsetX * (isFlipped ? -1 : 1), damageBoxInfo.offsetY);
//       const heldItemPosition = position.copy();
//       heldItemPosition.add(rotatePoint(offset, angle));
//       // @HACK SQUEAM: the collision mask, so that the player can mine berries for a horse archer shot
//       const heldItemHitbox = new Hitbox(transformComponent, limbHitbox, true, new RectangularBox(heldItemPosition, offset, damageBoxInfo.rotation * (isFlipped ? -1 : 1), damageBoxInfo.width, damageBoxInfo.height), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox, []);
//       addHitboxToTransformComponent(transformComponent, heldItemHitbox);
//    }

//    const swingAttackComponent = new SwingAttackComponent(owner, limb);
   
//    return {
//       entityType: EntityType.swingAttack,
//       components: {
//          [ServerComponentType.transform]: transformComponent,
//          [ServerComponentType.swingAttack]: swingAttackComponent
//       },
//       lights: [],
//       attachInfo: createEntityConfigAttachInfo(limbHitbox, ownerHitbox, true)
//    };
// }