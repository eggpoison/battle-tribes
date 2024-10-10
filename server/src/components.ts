import { ServerComponentType } from "battletribes-shared/components";
import { AmmoBoxComponent } from "./components/AmmoBoxComponent";
import { BerryBushComponent } from "./components/BerryBushComponent";
import { BlueprintComponent } from "./components/BlueprintComponent";
import { BuildingMaterialComponent } from "./components/BuildingMaterialComponent";
import { CactusComponent } from "./components/CactusComponent";
import { CookingComponent } from "./components/CookingComponent";
import { CowComponent } from "./components/CowComponent";
import { DoorComponent } from "./components/DoorComponent";
import { FenceComponent } from "./components/FenceComponent";
import { FenceGateComponent } from "./components/FenceGateComponent";
import { FishComponent } from "./components/FishComponent";
import { FrozenYetiComponent } from "./components/FrozenYetiComponent";
import { GolemComponent } from "./components/GolemComponent";
import { HealingTotemComponent } from "./components/HealingTotemComponent";
import { HealthComponent } from "./components/HealthComponent";
import { HutComponent } from "./components/HutComponent";
import { InventoryComponent } from "./components/InventoryComponent";
import { InventoryUseComponent } from "./components/InventoryUseComponent";
import { ItemComponent } from "./components/ItemComponent";
import { PhysicsComponent } from "./components/PhysicsComponent";
import { PlantComponent } from "./components/PlantComponent";
import { PlanterBoxComponent } from "./components/PlanterBoxComponent";
import { PlayerComponent } from "./components/PlayerComponent";
import { ResearchBenchComponent } from "./components/ResearchBenchComponent";
import { SlimeComponent } from "./components/SlimeComponent";
import { SlimeSpitComponent } from "./components/SlimeSpitComponent";
import { SnowballComponent } from "./components/SnowballComponent";
import { SpikesComponent } from "./components/SpikesComponent";
import { StatusEffectComponent } from "./components/StatusEffectComponent";
import { TombstoneComponent } from "./components/TombstoneComponent";
import { TotemBannerComponent } from "./components/TotemBannerComponent";
import { TreeComponent } from "./components/TreeComponent";
import { TribeComponent } from "./components/TribeComponent";
import { TribeMemberComponent } from "./components/TribeMemberComponent";
import { TribesmanAIComponent } from "./components/TribesmanAIComponent";
import { TunnelComponent } from "./components/TunnelComponent";
import { TurretComponent } from "./components/TurretComponent";
import { YetiComponent } from "./components/YetiComponent";
import { ZombieComponent } from "./components/ZombieComponent";
import { RockSpikeComponent } from "./components/RockSpikeComponent";
import { AIHelperComponent } from "./components/AIHelperComponent";
import { IceShardComponent } from "./components/IceShardComponent";
import { IceSpikesComponent } from "./components/IceSpikesComponent";
import { PebblumComponent } from "./components/PebblumComponent";
import { SlimewispComponent } from "./components/SlimewispComponent";
import { ThrowingProjectileComponent } from "./components/ThrowingProjectileComponent";
import { EscapeAIComponent } from "./components/EscapeAIComponent";
import { FollowAIComponent } from "./components/FollowAIComponent";
import { TribeWarriorComponent } from "./components/TribeWarriorComponent";
import { StructureComponent } from "./components/StructureComponent";
import { CraftingStationComponent } from "./components/CraftingStationComponent";
import { TransformComponent } from "./components/TransformComponent";
import { BoulderComponent } from "./components/BoulderComponent";
import { ProjectileComponent } from "./components/ProjectileComponent";
import { LayeredRodComponent } from "./components/LayeredRodComponent";
import { DecorationComponent } from "./components/DecorationComponent";
import { SpitPoisonAreaComponent } from "./components/SpitPoisonAreaComponent";
import { BattleaxeProjectileComponent } from "./components/BattleaxeProjectileComponent";
import { KrumblidComponent } from "./components/KrumblidComponent";
import { SpearProjectileComponent } from "./components/SpearProjectileComponent";
import { PunjiSticksComponent } from "./components/PunjiSticksComponent";
import { IceArrowComponent } from "./components/IceArrowComponent";
import { DamageBoxComponent } from "./components/DamageBoxComponent";
import { GuardianComponent } from "./components/GuardianComponent";
import { GuardianGemQuakeComponent } from "./components/GuardianGemQuakeComponent";
import { GuardianGemFragmentProjectileComponent } from "./components/GuardianGemFragmentProjectileComponent";
import { GuardianSpikyBallComponent } from "./components/GuardianSpikyBallComponent";
import { EntityType } from "battletribes-shared/entities";

// @Cleanup @Robustness: find better way to do this
// @Cleanup: see if you can remove the arrow functions
const ComponentClassRecord = {
   [ServerComponentType.aiHelper]: () => AIHelperComponent,
   [ServerComponentType.cow]: () => CowComponent,
   [ServerComponentType.turret]: () => TurretComponent,
   [ServerComponentType.tribe]: () => TribeComponent,
   [ServerComponentType.inventory]: () => InventoryComponent,
   [ServerComponentType.ammoBox]: () => AmmoBoxComponent,
   [ServerComponentType.slime]: () => SlimeComponent,
   [ServerComponentType.golem]: () => GolemComponent,
   [ServerComponentType.statusEffect]: () => StatusEffectComponent,
   [ServerComponentType.cactus]: () => CactusComponent,
   [ServerComponentType.health]: () => HealthComponent,
   [ServerComponentType.physics]: () => PhysicsComponent,
   [ServerComponentType.researchBench]: () => ResearchBenchComponent,
   [ServerComponentType.berryBush]: () => BerryBushComponent,
   [ServerComponentType.inventoryUse]: () => InventoryUseComponent,
   [ServerComponentType.zombie]: () => ZombieComponent,
   [ServerComponentType.player]: () => PlayerComponent,
   [ServerComponentType.item]: () => ItemComponent,
   [ServerComponentType.tombstone]: () => TombstoneComponent,
   [ServerComponentType.tree]: () => TreeComponent,
   [ServerComponentType.blueprint]: () => BlueprintComponent,
   [ServerComponentType.boulder]: () => BoulderComponent,
   [ServerComponentType.yeti]: () => YetiComponent,
   [ServerComponentType.frozenYeti]: () => FrozenYetiComponent,
   [ServerComponentType.totemBanner]: () => TotemBannerComponent,
   [ServerComponentType.cooking]: () => CookingComponent,
   [ServerComponentType.hut]: () => HutComponent,
   [ServerComponentType.snowball]: () => SnowballComponent,
   [ServerComponentType.fish]: () => FishComponent,
   [ServerComponentType.rockSpike]: () => RockSpikeComponent,
   [ServerComponentType.slimeSpit]: () => SlimeSpitComponent,
   [ServerComponentType.door]: () => DoorComponent,
   [ServerComponentType.tribesmanAI]: () => TribesmanAIComponent,
   [ServerComponentType.tunnel]: () => TunnelComponent,
   [ServerComponentType.buildingMaterial]: () => BuildingMaterialComponent,
   [ServerComponentType.spikes]: () => SpikesComponent,
   [ServerComponentType.punjiSticks]: () => PunjiSticksComponent,
   [ServerComponentType.tribeMember]: () => TribeMemberComponent,
   [ServerComponentType.healingTotem]: () => HealingTotemComponent,
   [ServerComponentType.planterBox]: () => PlanterBoxComponent,
   [ServerComponentType.plant]: () => PlantComponent,
   [ServerComponentType.structure]: () => StructureComponent,
   [ServerComponentType.fence]: () => FenceComponent,
   [ServerComponentType.fenceGate]: () => FenceGateComponent,
   [ServerComponentType.iceShard]: () => IceShardComponent,
   [ServerComponentType.iceSpikes]: () => IceSpikesComponent,
   [ServerComponentType.pebblum]: () => PebblumComponent,
   [ServerComponentType.slimewisp]: () => SlimewispComponent,
   [ServerComponentType.throwingProjectile]: () => ThrowingProjectileComponent,
   [ServerComponentType.escapeAI]: () => EscapeAIComponent,
   [ServerComponentType.followAI]: () => FollowAIComponent,
   [ServerComponentType.tribeWarrior]: () => TribeWarriorComponent,
   [ServerComponentType.craftingStation]: () => CraftingStationComponent,
   [ServerComponentType.transform]: () => TransformComponent,
   [ServerComponentType.projectile]: () => ProjectileComponent,
   [ServerComponentType.iceArrow]: () => IceArrowComponent,
   [ServerComponentType.layeredRod]: () => LayeredRodComponent,
   [ServerComponentType.decoration]: () => DecorationComponent,
   [ServerComponentType.spitPoisonArea]: () => SpitPoisonAreaComponent,
   [ServerComponentType.battleaxeProjectile]: () => BattleaxeProjectileComponent,
   [ServerComponentType.spearProjectile]: () => SpearProjectileComponent,
   [ServerComponentType.krumblid]: () => KrumblidComponent,
   [ServerComponentType.damageBox]: () => DamageBoxComponent,
   [ServerComponentType.guardian]: () => GuardianComponent,
   [ServerComponentType.guardianGemQuake]: () => GuardianGemQuakeComponent,
   [ServerComponentType.guardianGemFragmentProjectile]: () => GuardianGemFragmentProjectileComponent,
   [ServerComponentType.guardianSpikyBall]: () => GuardianSpikyBallComponent
} satisfies {
   [T in ServerComponentType]: () => {
      new (...args: any): unknown;
   };
};

type ComponentConfig<ComponentTypes extends ServerComponentType> = {
   [T in ComponentTypes]: InstanceType<ReturnType<typeof ComponentClassRecord[T]>>;
}

export interface EntityConfig<ComponentTypes extends ServerComponentType> {
   readonly entityType: EntityType;
   readonly components: ComponentConfig<ComponentTypes>;
}