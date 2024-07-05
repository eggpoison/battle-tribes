import Entity from "./Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AmmoBoxComponent } from "./components/AmmoBoxComponent";
import { ArrowComponent } from "./components/ArrowComponent";
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
import { RockSpikeProjectileComponent } from "./components/RockSpikeProjectileComponent";
import { AIHelperComponent } from "./components/AIHelperComponent";
import { IceShardComponent } from "./components/IceShardComponent";
import { IceSpikesComponent } from "./components/IceSpikesComponent";
import { PebblumComponent } from "./components/PebblumComponent";
import { SlimewispComponent } from "./components/SlimewispComponent";
import { ThrowingProjectileComponent } from "./components/ThrowingProjectileComponent";
import { WanderAIComponent } from "./components/WanderAIComponent";
import { EscapeAIComponent } from "./components/EscapeAIComponent";
import { FollowAIComponent } from "./components/FollowAIComponent";
import { TribeWarriorComponent } from "./components/TribeWarriorComponent";
import { StructureComponent } from "./components/StructureComponent";
import { CraftingStationComponent } from "./components/CraftingStationComponent";

// @Cleanup: find better way to do this
const Components = {
   [ServerComponentType.aiHelper]: (): AIHelperComponent => 0 as any,
   [ServerComponentType.cow]: (): CowComponent => 0 as any,
   [ServerComponentType.turret]: (): TurretComponent => 0 as any,
   [ServerComponentType.tribe]: (): TribeComponent => 0 as any,
   [ServerComponentType.inventory]: (): InventoryComponent => 0 as any,
   [ServerComponentType.ammoBox]: (): AmmoBoxComponent => 0 as any,
   [ServerComponentType.slime]: (): SlimeComponent => 0 as any,
   [ServerComponentType.golem]: (): GolemComponent => 0 as any,
   [ServerComponentType.statusEffect]: (): StatusEffectComponent => 0 as any,
   [ServerComponentType.cactus]: (): CactusComponent => 0 as any,
   [ServerComponentType.health]: (): HealthComponent => 0 as any,
   [ServerComponentType.physics]: (): PhysicsComponent => 0 as any,
   [ServerComponentType.researchBench]: (): ResearchBenchComponent => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponent => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponent => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponent => 0 as any,
   [ServerComponentType.player]: (): PlayerComponent => 0 as any,
   [ServerComponentType.item]: (): ItemComponent => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponent => 0 as any,
   [ServerComponentType.tree]: (): TreeComponent => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponent => 0 as any,
   [ServerComponentType.boulder]: (): BlueprintComponent => 0 as any,
   [ServerComponentType.arrow]: (): ArrowComponent => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponent => 0 as any,
   [ServerComponentType.frozenYeti]: (): FrozenYetiComponent => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponent => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponent => 0 as any,
   [ServerComponentType.hut]: (): HutComponent => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponent => 0 as any,
   [ServerComponentType.fish]: (): FishComponent => 0 as any,
   [ServerComponentType.rockSpike]: (): RockSpikeProjectileComponent => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponent => 0 as any,
   [ServerComponentType.door]: (): DoorComponent => 0 as any,
   [ServerComponentType.tribesmanAI]: (): TribesmanAIComponent => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponent => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponent => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponent => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponent => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponent => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponent => 0 as any,
   [ServerComponentType.plant]: (): PlantComponent => 0 as any,
   [ServerComponentType.structure]: (): StructureComponent => 0 as any,
   [ServerComponentType.fence]: (): FenceComponent => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponent => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponent => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponent => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponent => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponent => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponent => 0 as any,
   [ServerComponentType.wanderAI]: (): WanderAIComponent => 0 as any,
   [ServerComponentType.escapeAI]: (): EscapeAIComponent => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponent => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponent => 0 as any,
   [ServerComponentType.craftingStation]: (): CraftingStationComponent => 0 as any,
} satisfies Record<ServerComponentType, object>;

type Component<T extends ServerComponentType> = ReturnType<typeof Components[T]>;

// @Cleanup

type EntityCreationComponentsInfo<ComponentTypes extends ServerComponentType[]> = {
   [T in ComponentTypes[number]]: Component<T>;
};

export type ComponentRecord = Partial<{
   [T in ServerComponentType]: Component<T>;
}>;

export interface EntityCreationInfo<ComponentTypes extends ServerComponentType[]> {
   readonly entity: Entity;
   // @Temporary?
   // readonly components: EntityCreationComponentsInfo<ComponentTypes>;
   readonly components: ComponentRecord;
}