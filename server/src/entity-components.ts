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

// @Cleanup: File name

type Components = {
   [ServerComponentType.aiHelper]: AIHelperComponent,
   [ServerComponentType.cow]: CowComponent,
   [ServerComponentType.turret]: TurretComponent,
   [ServerComponentType.tribe]: TribeComponent,
   [ServerComponentType.inventory]: InventoryComponent,
   [ServerComponentType.ammoBox]: AmmoBoxComponent,
   [ServerComponentType.slime]: SlimeComponent,
   [ServerComponentType.golem]: GolemComponent,
   [ServerComponentType.statusEffect]: StatusEffectComponent,
   [ServerComponentType.cactus]: CactusComponent,
   [ServerComponentType.health]: HealthComponent,
   [ServerComponentType.physics]: PhysicsComponent,
   [ServerComponentType.researchBench]: ResearchBenchComponent,
   [ServerComponentType.berryBush]: BerryBushComponent,
   [ServerComponentType.inventoryUse]: InventoryUseComponent,
   [ServerComponentType.zombie]: ZombieComponent,
   [ServerComponentType.player]: PlayerComponent,
   [ServerComponentType.item]: ItemComponent,
   [ServerComponentType.tombstone]: TombstoneComponent,
   [ServerComponentType.tree]: TreeComponent,
   [ServerComponentType.blueprint]: BlueprintComponent,
   [ServerComponentType.boulder]: BlueprintComponent,
   [ServerComponentType.arrow]: ArrowComponent,
   [ServerComponentType.yeti]: YetiComponent,
   [ServerComponentType.frozenYeti]: FrozenYetiComponent,
   [ServerComponentType.totemBanner]: TotemBannerComponent,
   [ServerComponentType.cooking]: CookingComponent,
   [ServerComponentType.hut]: HutComponent,
   [ServerComponentType.snowball]: SnowballComponent,
   [ServerComponentType.fish]: FishComponent,
   [ServerComponentType.rockSpike]: RockSpikeProjectileComponent,
   [ServerComponentType.slimeSpit]: SlimeSpitComponent,
   [ServerComponentType.door]: DoorComponent,
   [ServerComponentType.tribesman]: TribesmanAIComponent,
   [ServerComponentType.tunnel]: TunnelComponent,
   [ServerComponentType.buildingMaterial]: BuildingMaterialComponent,
   [ServerComponentType.spikes]: SpikesComponent,
   [ServerComponentType.tribeMember]: TribeMemberComponent,
   [ServerComponentType.healingTotem]: HealingTotemComponent,
   [ServerComponentType.planterBox]: PlanterBoxComponent,
   [ServerComponentType.plant]: PlantComponent,
   [ServerComponentType.structure]: StructureComponent,
   [ServerComponentType.fence]: FenceComponent,
   [ServerComponentType.fenceGate]: FenceGateComponent,
   [ServerComponentType.iceShard]: IceShardComponent,
   [ServerComponentType.iceSpikes]: IceSpikesComponent,
   [ServerComponentType.pebblum]: PebblumComponent,
   [ServerComponentType.slimewisp]: SlimewispComponent,
   [ServerComponentType.throwingProjectile]: ThrowingProjectileComponent,
   [ServerComponentType.wanderAI]: WanderAIComponent,
   [ServerComponentType.escapeAI]: EscapeAIComponent,
   [ServerComponentType.followAI]: FollowAIComponent,
   [ServerComponentType.tribeWarrior]: TribeWarriorComponent
};

type Component<T extends ServerComponentType> = Components[T];

type EntityCreationComponentsInfo<ComponentTypes extends ServerComponentType[]> = {
   [T in ComponentTypes[number]]: Component<T>;
};

export interface EntityCreationInfo<ComponentTypes extends ServerComponentType[]> {
   readonly entity: Entity;
   readonly components: EntityCreationComponentsInfo<ComponentTypes>;
}