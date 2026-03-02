import { createAbsolutePivotPoint, createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { OkrenClawComponent, OkrenClawGrowthStage } from "../../components/OkrenClawComponent";
import { OkrenAgeStage } from "../../components/OkrenComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

const MAX_HEALTHS = [20, 25, 30, 35, 40];
const ENERGIES = [400, 600, 800, 1000, 1200];

export function getOkrenClawBigArmSegmentSize(size: OkrenAgeStage, growthStage: OkrenClawGrowthStage): Point {
   switch (size) {
      case OkrenAgeStage.juvenile: return new Point(36, 72);
      case OkrenAgeStage.youth:    return new Point(36, 72);
      case OkrenAgeStage.adult:    return new Point(36, 72);
      case OkrenAgeStage.elder:    return new Point(36, 72);
      case OkrenAgeStage.ancient: {
         switch (growthStage) {
            case OkrenClawGrowthStage.ONE:   return new Point(28, 56);
            case OkrenClawGrowthStage.TWO:   return new Point(36, 72);
            case OkrenClawGrowthStage.THREE: return new Point(36, 72);
            case OkrenClawGrowthStage.FOUR:  return new Point(36, 72);
         }
      }
   }
}

export function getOkrenClawBigArmSegmentOffset(size: OkrenAgeStage, growthStage: OkrenClawGrowthStage): Point {
   switch (size) {
      case OkrenAgeStage.juvenile: return new Point(52, 66);
      case OkrenAgeStage.youth:    return new Point(64, 68);
      case OkrenAgeStage.adult:    return new Point(74, 72);
      case OkrenAgeStage.elder:    return new Point(80, 84);
      case OkrenAgeStage.ancient: {
         switch (growthStage) {
            case OkrenClawGrowthStage.ONE:   return new Point(72, 70);
            case OkrenClawGrowthStage.TWO:   return new Point(74, 72);
            case OkrenClawGrowthStage.THREE: return new Point(80, 84);
            case OkrenClawGrowthStage.FOUR:  return new Point(86, 90);
         }
      }
   }
}

export function getOkrenClawMediumArmSegmentSize(size: OkrenAgeStage, growthStage: OkrenClawGrowthStage): Point {
   switch (size) {
      case OkrenAgeStage.juvenile: return new Point(20, 40);
      case OkrenAgeStage.youth:    return new Point(20, 40);
      case OkrenAgeStage.adult:    return new Point(20, 40);
      case OkrenAgeStage.elder:    return new Point(20, 40);
      case OkrenAgeStage.ancient:  {
         switch (growthStage) {
            case OkrenClawGrowthStage.ONE:   return new Point(20, 40);
            case OkrenClawGrowthStage.TWO:   return new Point(20, 40);
            case OkrenClawGrowthStage.THREE: return new Point(28, 60);
            case OkrenClawGrowthStage.FOUR:  return new Point(36, 72);
         }
      }
   }
}

export function getOkrenClawMediumArmSegmentOffset(size: OkrenAgeStage, growthStage: OkrenClawGrowthStage): Point {
   switch (size) {
      case OkrenAgeStage.juvenile: return new Point(0, 64);
      case OkrenAgeStage.youth:    return new Point(4, 68);
      case OkrenAgeStage.adult:    return new Point(4, 72);
      case OkrenAgeStage.elder:    return new Point(4, 74);
      case OkrenAgeStage.ancient:  {
         switch (growthStage) {
            case OkrenClawGrowthStage.ONE:   return new Point(4, 40);
            case OkrenClawGrowthStage.TWO:   return new Point(4, 48);
            case OkrenClawGrowthStage.THREE: return new Point(4, 62);
            case OkrenClawGrowthStage.FOUR:  return new Point(4, 76);
         }
      }
   }
}

export function getOkrenClawSlashingArmSegmentSize(size: OkrenAgeStage, growthStage: OkrenClawGrowthStage): Point {
   switch (size) {
      case OkrenAgeStage.juvenile: return new Point(20, 80);
      case OkrenAgeStage.youth:    return new Point(20, 80);
      case OkrenAgeStage.adult:    return new Point(20, 80);
      case OkrenAgeStage.elder:    return new Point(20, 80);
      case OkrenAgeStage.ancient:  {
         switch (growthStage) {
            case OkrenClawGrowthStage.ONE:   return new Point(12, 32);
            case OkrenClawGrowthStage.TWO:   return new Point(16, 42);
            case OkrenClawGrowthStage.THREE: return new Point(16, 56);
            case OkrenClawGrowthStage.FOUR:  return new Point(20, 80);
         }
      }
   }
}

export function getOkrenClawSlashingArmSegmentOffset(size: OkrenAgeStage, growthStage: OkrenClawGrowthStage): Point {
   switch (size) {
      case OkrenAgeStage.juvenile: return new Point(0, 56);
      case OkrenAgeStage.youth:    return new Point(0, 60);
      case OkrenAgeStage.adult:    return new Point(0, 68);
      case OkrenAgeStage.elder:    return new Point(0, 78);
      case OkrenAgeStage.ancient:  {
         switch (growthStage) {
            case OkrenClawGrowthStage.ONE:   return new Point(0, 36);
            case OkrenClawGrowthStage.TWO:   return new Point(0, 48);
            case OkrenClawGrowthStage.THREE: return new Point(0, 56);
            case OkrenClawGrowthStage.FOUR:  return new Point(0, 78);
         }
      }
   }
}

export function createOkrenClawConfig(position: Point, angle: number, size: OkrenAgeStage, growthStage: OkrenClawGrowthStage, sideIsFlipped: boolean): EntityConfig {
   const transformComponent = new TransformComponent();

   const bigArmSegmentSize = getOkrenClawBigArmSegmentSize(size, growthStage);
   const bigArmSegmentOffset = getOkrenClawBigArmSegmentOffset(size, growthStage);
   
   const bigArmSegmentPosition = position.copy();
   bigArmSegmentPosition.add(bigArmSegmentOffset);
   const bigArmSegmentHitbox = new Hitbox(transformComponent, null, true, new RectangularBox(bigArmSegmentPosition, bigArmSegmentOffset, Math.PI * 0.3, bigArmSegmentSize.x, bigArmSegmentSize.y), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BIG_ARM_SEGMENT]);
   bigArmSegmentHitbox.box.flipX = sideIsFlipped;
   // @Hack
   bigArmSegmentHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
   bigArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(-2, -38);
   addHitboxToTransformComponent(transformComponent, bigArmSegmentHitbox);

   const mediumArmSegmentSize = getOkrenClawMediumArmSegmentSize(size, growthStage);
   const mediumArmSegmentOffset = getOkrenClawMediumArmSegmentOffset(size, growthStage);

   const mediumArmSegmentPosition = bigArmSegmentHitbox.box.position.copy();
   mediumArmSegmentPosition.add(mediumArmSegmentOffset);
   const mediumArmSegmentHitbox = new Hitbox(transformComponent, bigArmSegmentHitbox, true, new RectangularBox(mediumArmSegmentPosition, mediumArmSegmentOffset, -Math.PI * 0.3, mediumArmSegmentSize.x, mediumArmSegmentSize.y), 1.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT]);
   // @Temporary?? see if this absolute stuff works right
   // let mediumArmPivotY: number;
   // switch (size) {
   //    case OkrenAgeStage.juvenile: mediumArmPivotY = -28; break;
   //    case OkrenAgeStage.youth:    mediumArmPivotY = -32; break;
   //    case OkrenAgeStage.adult:    mediumArmPivotY = -36; break;
   //    case OkrenAgeStage.elder:    mediumArmPivotY = -38; break;
   //    case OkrenAgeStage.ancient:  mediumArmPivotY = -38; break;
   // }
   // mediumArmSegmentHitbox.box.pivot = createAbsolutePivotPoint(0, mediumArmPivotY);
   mediumArmSegmentHitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, mediumArmSegmentHitbox);
   
   const slashingArmSegmentSize = getOkrenClawSlashingArmSegmentSize(size, growthStage);
   const slashingArmSegmentOffset = getOkrenClawSlashingArmSegmentOffset(size, growthStage);;

   const slashingArmSegmentPosition = mediumArmSegmentHitbox.box.position.copy();
   slashingArmSegmentPosition.add(slashingArmSegmentOffset);
   const slashingArmSegmentHitbox = new Hitbox(transformComponent, mediumArmSegmentHitbox, true, new RectangularBox(slashingArmSegmentPosition, slashingArmSegmentOffset, -Math.PI * 0.3, slashingArmSegmentSize.x, slashingArmSegmentSize.y), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION]);
   // @Temporary?
   // let smallArmPivotPoint: PivotPoint;
   // switch (size) {
   //    case OkrenAgeStage.juvenile: smallArmPivotPoint = createAbsolutePivotPoint(0, -26); break;
   //    case OkrenAgeStage.youth:    smallArmPivotPoint = createAbsolutePivotPoint(0, -30); break;
   //    case OkrenAgeStage.adult:    smallArmPivotPoint = createAbsolutePivotPoint(0, -32); break;
   //    case OkrenAgeStage.elder:    smallArmPivotPoint = createAbsolutePivotPoint(0, -36); break;
   //    case OkrenAgeStage.ancient:  smallArmPivotPoint = createAbsolutePivotPoint(-4, -40); break;
   // }
   // slashingArmSegmentHitbox.box.pivot = smallArmPivotPoint;
   slashingArmSegmentHitbox.box.pivot = createNormalisedPivotPoint(-0.1, -0.5);
   addHitboxToTransformComponent(transformComponent, slashingArmSegmentHitbox);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const healthComponent = new HealthComponent(MAX_HEALTHS[size]);

   const energyStoreComponent = new EnergyStoreComponent(ENERGIES[size]);
   
   const okrenClawComponent = new OkrenClawComponent(size, growthStage);

   return {
      entityType: EntityType.okrenClaw,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.energyStore]: energyStoreComponent,
         [ServerComponentType.okrenClaw]: okrenClawComponent
      },
      lights: []
   };
}