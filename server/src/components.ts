import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AmmoBoxComponent, AmmoBoxComponentParams } from "./components/AmmoBoxComponent";
import { BerryBushComponent, BerryBushComponentParams } from "./components/BerryBushComponent";
import { BlueprintComponent, BlueprintComponentParams } from "./components/BlueprintComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentParams } from "./components/BuildingMaterialComponent";
import { CactusComponent, CactusComponentParams } from "./components/CactusComponent";
import { CookingComponent, CookingComponentParams } from "./components/CookingComponent";
import { CowComponent, CowComponentParams } from "./components/CowComponent";
import { DoorComponent, DoorComponentParams } from "./components/DoorComponent";
import { FenceComponent, FenceComponentParams } from "./components/FenceComponent";
import { FenceGateComponent, FenceGateComponentParams } from "./components/FenceGateComponent";
import { FishComponent, FishComponentParams } from "./components/FishComponent";
import { FrozenYetiComponent, FrozenYetiComponentParams } from "./components/FrozenYetiComponent";
import { GolemComponent, GolemComponentParams } from "./components/GolemComponent";
import { HealingTotemComponent, HealingTotemComponentParams } from "./components/HealingTotemComponent";
import { HealthComponent, HealthComponentParams } from "./components/HealthComponent";
import { HutComponent, HutComponentParams } from "./components/HutComponent";
import { InventoryComponent, InventoryComponentParams } from "./components/InventoryComponent";
import { InventoryUseComponent, InventoryUseComponentParams } from "./components/InventoryUseComponent";
import { ItemComponent, ItemComponentParams } from "./components/ItemComponent";
import { PhysicsComponent, PhysicsComponentParams } from "./components/PhysicsComponent";
import { PlantComponent, PlantComponentParams } from "./components/PlantComponent";
import { PlanterBoxComponent, PlanterBoxComponentParams } from "./components/PlanterBoxComponent";
import { PlayerComponent, PlayerComponentParams } from "./components/PlayerComponent";
import { ResearchBenchComponent, ResearchBenchComponentParams } from "./components/ResearchBenchComponent";
import { SlimeComponent, SlimeComponentParams } from "./components/SlimeComponent";
import { SlimeSpitComponent, SlimeSpitComponentParams } from "./components/SlimeSpitComponent";
import { SnowballComponent, SnowballComponentParams } from "./components/SnowballComponent";
import { SpikesComponent, SpikesComponentParams } from "./components/SpikesComponent";
import { StatusEffectComponent, StatusEffectComponentParams } from "./components/StatusEffectComponent";
import { TombstoneComponent, TombstoneComponentParams } from "./components/TombstoneComponent";
import { TotemBannerComponent, TotemBannerComponentParams } from "./components/TotemBannerComponent";
import { TreeComponent, TreeComponentParams } from "./components/TreeComponent";
import { TribeComponent, TribeComponentParams } from "./components/TribeComponent";
import { TribeMemberComponent, TribeMemberComponentParams } from "./components/TribeMemberComponent";
import { TribesmanAIComponent, TribesmanAIComponentParams } from "./components/TribesmanAIComponent";
import { TunnelComponent, TunnelComponentParams } from "./components/TunnelComponent";
import { TurretComponent, TurretComponentParams } from "./components/TurretComponent";
import { YetiComponent, YetiComponentParams } from "./components/YetiComponent";
import { ZombieComponent, ZombieComponentParams } from "./components/ZombieComponent";
import { RockSpikeComponent, RockSpikeProjectileComponentParams } from "./components/RockSpikeComponent";
import { AIHelperComponent, AIHelperComponentParams } from "./components/AIHelperComponent";
import { IceShardComponent, IceShardComponentParams } from "./components/IceShardComponent";
import { IceSpikesComponent, IceSpikesComponentParams } from "./components/IceSpikesComponent";
import { PebblumComponent, PebblumComponentParams } from "./components/PebblumComponent";
import { SlimewispComponent, SlimewispComponentParams } from "./components/SlimewispComponent";
import { ThrowingProjectileComponent, ThrowingProjectileComponentParams } from "./components/ThrowingProjectileComponent";
import { WanderAIComponent, WanderAIComponentParams } from "./components/WanderAIComponent";
import { EscapeAIComponent, EscapeAIComponentParams } from "./components/EscapeAIComponent";
import { FollowAIComponent, FollowAIComponentParams } from "./components/FollowAIComponent";
import { TribeWarriorComponent, TribeWarriorComponentParams } from "./components/TribeWarriorComponent";
import { StructureComponent, StructureComponentParams } from "./components/StructureComponent";
import { CraftingStationComponent, CraftingStationComponentParams } from "./components/CraftingStationComponent";
import { TransformComponent, TransformComponentParams } from "./components/TransformComponent";
import { BoulderComponent, BoulderComponentParams } from "./components/BoulderComponent";
import { ProjectileComponent, ProjectileComponentParams } from "./components/ProjectileComponent";
import { LayeredRodComponent, LayeredRodComponentParams } from "./components/LayeredRodComponent";
import { DecorationComponent, DecorationComponentParams } from "./components/DecorationComponent";
import { SpitPoisonAreaComponent, SpitPoisonAreaComponentParams } from "./components/SpitPoisonAreaComponent";
import { BattleaxeProjectileComponent, BattleaxeProjectileComponentParams } from "./components/BattleaxeProjectileComponent";
import { KrumblidComponent, KrumblidComponentParams } from "./components/KrumblidComponent";
import { SpearProjectileComponent, SpearProjectileComponentParams } from "./components/SpearProjectileComponent";
import { PunjiSticksComponent, PunjiSticksComponentParams } from "./components/PunjiSticksComponent";
import { IceArrowComponent, IceArrowComponentParams } from "./components/IceArrowComponent";
import { DamageBoxComponent, DamageBoxComponentParams } from "./components/DamageBoxComponent";

const ComponentParamsRecord = {
   [ServerComponentType.aiHelper]: (): AIHelperComponentParams => 0 as any,
   [ServerComponentType.cow]: (): CowComponentParams => 0 as any,
   [ServerComponentType.turret]: (): TurretComponentParams => 0 as any,
   [ServerComponentType.tribe]: (): TribeComponentParams => 0 as any,
   [ServerComponentType.inventory]: (): InventoryComponentParams => 0 as any,
   [ServerComponentType.ammoBox]: (): AmmoBoxComponentParams => 0 as any,
   [ServerComponentType.slime]: (): SlimeComponentParams => 0 as any,
   [ServerComponentType.golem]: (): GolemComponentParams => 0 as any,
   [ServerComponentType.statusEffect]: (): StatusEffectComponentParams => 0 as any,
   [ServerComponentType.cactus]: (): CactusComponentParams => 0 as any,
   [ServerComponentType.health]: (): HealthComponentParams => 0 as any,
   [ServerComponentType.physics]: (): PhysicsComponentParams => 0 as any,
   [ServerComponentType.researchBench]: (): ResearchBenchComponentParams => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponentParams => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponentParams => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponentParams => 0 as any,
   [ServerComponentType.player]: (): PlayerComponentParams => 0 as any,
   [ServerComponentType.item]: (): ItemComponentParams => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponentParams => 0 as any,
   [ServerComponentType.tree]: (): TreeComponentParams => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponentParams => 0 as any,
   [ServerComponentType.boulder]: (): BoulderComponentParams => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponentParams => 0 as any,
   [ServerComponentType.frozenYeti]: (): FrozenYetiComponentParams => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponentParams => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponentParams => 0 as any,
   [ServerComponentType.hut]: (): HutComponentParams => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponentParams => 0 as any,
   [ServerComponentType.fish]: (): FishComponentParams => 0 as any,
   [ServerComponentType.rockSpike]: (): RockSpikeProjectileComponentParams => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponentParams => 0 as any,
   [ServerComponentType.door]: (): DoorComponentParams => 0 as any,
   [ServerComponentType.tribesmanAI]: (): TribesmanAIComponentParams => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponentParams => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponentParams => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponentParams => 0 as any,
   [ServerComponentType.punjiSticks]: (): PunjiSticksComponentParams => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponentParams => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponentParams => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponentParams => 0 as any,
   [ServerComponentType.plant]: (): PlantComponentParams => 0 as any,
   [ServerComponentType.structure]: (): StructureComponentParams => 0 as any,
   [ServerComponentType.fence]: (): FenceComponentParams => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponentParams => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponentParams => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponentParams => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponentParams => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponentParams => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponentParams => 0 as any,
   [ServerComponentType.wanderAI]: (): WanderAIComponentParams => 0 as any,
   [ServerComponentType.escapeAI]: (): EscapeAIComponentParams => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponentParams => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponentParams => 0 as any,
   [ServerComponentType.craftingStation]: (): CraftingStationComponentParams => 0 as any,
   [ServerComponentType.transform]: (): TransformComponentParams => 0 as any,
   [ServerComponentType.projectile]: (): ProjectileComponentParams => 0 as any,
   [ServerComponentType.iceArrow]: (): IceArrowComponentParams => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponentParams => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponentParams => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponentParams => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponentParams => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponentParams => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponentParams => 0 as any,
   [ServerComponentType.damageBox]: (): DamageBoxComponentParams => 0 as any
} satisfies Record<ServerComponentType, object>;

export type ComponentParams<T extends ServerComponentType> = ReturnType<typeof ComponentParamsRecord[T]>;

// @Cleanup: find better way to do this
export const ComponentClassRecord = {
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
   [ServerComponentType.wanderAI]: () => WanderAIComponent,
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
   [ServerComponentType.damageBox]: () => DamageBoxComponent
} satisfies {
   [T in ServerComponentType]: () => {
      new (args: ComponentParams<T>): unknown;
   };
};

// type Component<T extends ServerComponentType> = typeof ComponentClassRecord[T];

// const a: Component<ServerComponentType.cow> = 1;
// const b = new a();
// @Cleanup

// type EntityCreationComponentsInfo<ComponentTypes extends ServerComponentType[]> = {
//    [T in ComponentTypes[number]]: Component<T>;
// };

// @Temporary?
// export type ComponentRecord = Partial<{
//    [T in ServerComponentType]: Component<T>;
// }>;

// export interface EntityCreationInfo<ComponentTypes extends ServerComponentType[]> {
//    readonly entity: Entity;
//    // @Temporary?
//    // readonly components: EntityCreationComponentsInfo<ComponentTypes>;
//    readonly components: ComponentRecord;
// }

export type ComponentConfig<ComponentTypes extends ServerComponentType> = {
   [T in ComponentTypes]: ComponentParams<T>;
}

// export type ComponentTypes = 