import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { ThrowingProjectileComponent } from "../../components/ThrowingProjectileComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import Tribe from "../../Tribe";
import { BattleaxeProjectileComponent } from "../../components/BattleaxeProjectileComponent";
import { Hitbox } from "../../hitboxes";

export function createBattleaxeProjectileConfig(position: Point, rotation: number, tribe: Tribe, tribeMember: Entity, itemID: number | null): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 32), 0.6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);   
   
   
   const tribeComponent = new TribeComponent(tribe);
   
   const throwingProjectileComponent = new ThrowingProjectileComponent(tribeMember, itemID);
   
   const battleaxeProjectileComponent = new BattleaxeProjectileComponent();
   
   return {
      entityType: EntityType.battleaxeProjectile,
      components: [
         transformComponent,
         tribeComponent,
         throwingProjectileComponent,
         battleaxeProjectileComponent
      ],
      lights: []
   };
}

// export function onBattleaxeProjectileCollision(battleaxe: Entity, collidingEntity: Entity, collisionPoint: Point): void {
//    // Don't hurt the entity who threw the spear
//    const spearComponent = ThrowingProjectileComponentArray.getComponent(battleaxe);
//    if (collidingEntity === spearComponent.tribeMember) {
//       return;
//    }

//    const relationship = getEntityRelationship(battleaxe, collidingEntity);
//    if (relationship === EntityRelationship.friendly || relationship === EntityRelationship.friendlyBuilding) {
//       return;
//    }

//    if (HealthComponentArray.hasComponent(collidingEntity)) {
//       const healthComponent = HealthComponentArray.getComponent(collidingEntity);
//       const attackHash = "battleaxe-" + battleaxe;
//       if (!canDamageEntity(healthComponent, attackHash)) {
//          return;
//       }
      
//       const tribeMember = validateEntity(spearComponent.tribeMember);

//       // Damage the entity
//       const battleaxeTransformComponent = TransformComponentArray.getComponent(battleaxe);
//       const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
//       const direction = battleaxeTransformComponent.position.angleTo(collidingEntityTransformComponent.position);

//       // @Incomplete cause of death
//       damageEntity(collidingEntity, tribeMember, 4, DamageSource.spear, AttackEffectiveness.effective, collisionPoint, 0);
//       applyKnockback(collidingEntity, 150, direction);
//       addLocalInvulnerabilityHash(collidingEntity, attackHash, 0.3);
//    }
// }