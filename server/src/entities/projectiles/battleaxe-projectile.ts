import { DEFAULT_COLLISION_MASK, CollisionBit, Entity, EntityType, Point, HitboxCollisionType, CircularBox } from "battletribes-shared";
import { ThrowingProjectileComponent } from "../../components/ThrowingProjectileComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import Tribe from "../../Tribe.js";
import { BattleaxeProjectileComponent } from "../../components/BattleaxeProjectileComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createBattleaxeProjectileConfig(x: number, y: number, rotation: number, tribe: Tribe, tribeMember: Entity, itemID: number | null): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, rotation, 32), 0.6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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