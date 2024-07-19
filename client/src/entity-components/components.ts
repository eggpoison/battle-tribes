import { ComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import TurretComponent from "./TurretComponent";
import CowComponent from "./CowComponent";
import TribeComponent from "./TribeComponent";
import InventoryComponent from "./InventoryComponent";
import AmmoBoxComponent from "./AmmoBoxComponent";
import SlimeComponent from "./SlimeComponent";
import GolemComponent from "./GolemComponent";
import StatusEffectComponent from "./StatusEffectComponent";
import CactusComponent from "./CactusComponent";
import HealthComponent from "./HealthComponent";
import PhysicsComponent from "./PhysicsComponent";
import ResearchBenchComponent from "./ResearchBenchComponent";
import BerryBushComponent from "./BerryBushComponent";
import InventoryUseComponent from "./InventoryUseComponent";
import ZombieComponent from "./ZombieComponent";
import Component from "./Component";
import EquipmentComponent from "./EquipmentComponent";
import PlayerComponent from "./PlayerComponent";
import ItemComponent from "./ItemComponent";
import TombstoneComponent from "./TombstoneComponent";
import TreeComponent from "./TreeComponent";
import BlueprintComponent from "./BlueprintComponent";
import ProjectileComponent from "./ArrowComponent";
import YetiComponent from "./YetiComponent";
import FrozenYetiComponent from "./FrozenYetiComponent";
import FootprintComponent from "./FootprintComponent";
import ServerComponent from "./ServerComponent";
import TotemBannerComponent from "./TotemBannerComponent";
import HutComponent from "./HutComponent";
import CookingComponent from "./CookingComponent";
import SnowballComponent from "./SnowballComponent";
import FishComponent from "./FishComponent";
import RockSpikeComponent from "./RockSpikeComponent";
import SlimeSpitComponent from "./SlimeSpitComponent";
import DoorComponent from "./DoorComponent";
import TribesmanAIComponent from "./TribesmanAIComponent";
import TunnelComponent from "./TunnelComponent";
import BuildingMaterialComponent from "./BuildingMaterialComponent";
import SpikesComponent from "./SpikesComponent";
import TribeMemberComponent from "./TribeMemberComponent";
import HealingTotemComponent from "./HealingTotemComponent";
import PlantComponent from "./PlantComponent";
import PlanterBoxComponent from "./PlanterBoxComponent";
import FenceComponent from "./FenceComponent";
import FenceGateComponent from "./FenceGateComponent";
import StructureComponent from "./StructureComponent";
import CraftingStationComponent from "./CraftingStationComponent";
import Entity from "../Entity";
import BoulderComponent from "./BoulderComponent";
import AIHelperComponent from "./AIHelperComponent";
import WanderAIComponent from "./WanderAIComponent";
import EscapeAIComponent from "./EscapeAIComponent";
import IceSpikesComponent from "./IceSpikesComponent";
import FollowAIComponent from "./FollowAIComponent";
import IceShardComponent from "./IceShardComponent";
import PebblumComponent from "./PebblumComponent";
import SlimewispComponent from "./SlimewispComponent";
import ThrowingProjectileComponent from "./ThrowingProjectileComponent";
import TribeWarriorComponent from "./TribeWarriorComponent";
import TransformComponent from "./TransformComponent";
import LayeredRodComponent from "./LayeredRodComponent";
import { PacketReader } from "webgl-test-shared/dist/packets";

export enum ClientComponentType {
   equipment,
   footprint
}

const ServerComponents = {
   [ServerComponentType.transform]: (): TransformComponent => 0 as any,
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
   [ServerComponentType.projectile]: (): ProjectileComponent => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponent => 0 as any,
   [ServerComponentType.frozenYeti]: (): FrozenYetiComponent => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponent => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponent => 0 as any,
   [ServerComponentType.hut]: (): HutComponent => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponent => 0 as any,
   [ServerComponentType.fish]: (): FishComponent => 0 as any,
   [ServerComponentType.rockSpike]: (): RockSpikeComponent => 0 as any,
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
   [ServerComponentType.craftingStation]: (): CraftingStationComponent => 0 as any,
   [ServerComponentType.aiHelper]: (): AIHelperComponent => 0 as any,
   [ServerComponentType.boulder]: (): BoulderComponent => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponent => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponent => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponent => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponent => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponent => 0 as any,
   [ServerComponentType.wanderAI]: (): WanderAIComponent => 0 as any,
   [ServerComponentType.escapeAI]: (): EscapeAIComponent => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponent => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponent => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponent => 0 as any
} satisfies Record<ServerComponentType, () => ServerComponent>;

export const ClientComponents = {
   [ClientComponentType.equipment]: (): EquipmentComponent => 0 as any,
   [ClientComponentType.footprint]: (): FootprintComponent => 0 as any
} satisfies Record<ClientComponentType, () => Component>;

export type ServerComponentClass<T extends ServerComponentType> = ReturnType<typeof ServerComponents[T]>;
export type ClientComponentClass<T extends ClientComponentType> = ReturnType<typeof ClientComponents[T]>;

export function createComponent(entity: Entity, componentType: ServerComponentType, reader: PacketReader): ServerComponent {
   switch (componentType) {
      case ServerComponentType.transform: return new TransformComponent(entity, reader);
      case ServerComponentType.cow: return new CowComponent(entity, reader);
      case ServerComponentType.turret: return new TurretComponent(entity, reader);
      case ServerComponentType.tribe: return new TribeComponent(entity, reader);
      case ServerComponentType.inventory: return new InventoryComponent(entity, reader);
      case ServerComponentType.ammoBox: return new AmmoBoxComponent(entity, reader);
      case ServerComponentType.slime: return new SlimeComponent(entity, reader);
      case ServerComponentType.golem: return new GolemComponent(entity, reader);
      case ServerComponentType.statusEffect: return new StatusEffectComponent(entity, reader);
      case ServerComponentType.cactus: return new CactusComponent(entity, reader);
      case ServerComponentType.health: return new HealthComponent(entity, reader);
      case ServerComponentType.physics: return new PhysicsComponent(entity, reader);
      case ServerComponentType.researchBench: return new ResearchBenchComponent(entity, reader);
      case ServerComponentType.berryBush: return new BerryBushComponent(entity, reader);
      case ServerComponentType.inventoryUse: return new InventoryUseComponent(entity, reader);
      case ServerComponentType.zombie: return new ZombieComponent(entity, reader);
      case ServerComponentType.player: return new PlayerComponent(entity, reader);
      case ServerComponentType.item: return new ItemComponent(entity, reader);
      case ServerComponentType.tombstone: return new TombstoneComponent(entity, reader);
      case ServerComponentType.tree: return new TreeComponent(entity, reader);
      case ServerComponentType.blueprint: return new BlueprintComponent(entity, reader);
      case ServerComponentType.projectile: return new ProjectileComponent(entity);
      case ServerComponentType.yeti: return new YetiComponent(entity, reader);
      case ServerComponentType.frozenYeti: return new FrozenYetiComponent(entity, reader);
      case ServerComponentType.totemBanner: return new TotemBannerComponent(entity, reader);
      case ServerComponentType.cooking: return new CookingComponent(entity, reader);
      case ServerComponentType.hut: return new HutComponent(entity, reader);
      case ServerComponentType.snowball: return new SnowballComponent(entity, reader);
      case ServerComponentType.fish: return new FishComponent(entity, reader);
      case ServerComponentType.rockSpike: return new RockSpikeComponent(entity, reader);
      case ServerComponentType.slimeSpit: return new SlimeSpitComponent(entity, reader);
      case ServerComponentType.door: return new DoorComponent(entity, reader);
      case ServerComponentType.tribesmanAI: return new TribesmanAIComponent(entity, reader);
      case ServerComponentType.tunnel: return new TunnelComponent(entity, reader);
      case ServerComponentType.buildingMaterial: return new BuildingMaterialComponent(entity, reader);
      case ServerComponentType.spikes: return new SpikesComponent(entity, reader);
      case ServerComponentType.tribeMember: return new TribeMemberComponent(entity, reader);
      case ServerComponentType.healingTotem: return new HealingTotemComponent(entity, reader);
      case ServerComponentType.planterBox: return new PlanterBoxComponent(entity, reader);
      case ServerComponentType.plant: return new PlantComponent(entity, reader);
      case ServerComponentType.structure: return new StructureComponent(entity, reader);
      case ServerComponentType.fence: return new FenceComponent(entity);
      case ServerComponentType.fenceGate: return new FenceGateComponent(entity, reader);
      case ServerComponentType.craftingStation: return new CraftingStationComponent(entity, reader);
      case ServerComponentType.boulder: return new BoulderComponent(entity, reader);
      case ServerComponentType.aiHelper: return new AIHelperComponent(entity, reader);
      case ServerComponentType.wanderAI: return new WanderAIComponent(entity, reader);
      case ServerComponentType.escapeAI: return new EscapeAIComponent(entity, reader);
      case ServerComponentType.iceSpikes: return new IceSpikesComponent(entity);
      case ServerComponentType.followAI: return new FollowAIComponent(entity, reader);
      case ServerComponentType.iceShard: return new IceShardComponent(entity);
      case ServerComponentType.pebblum: return new PebblumComponent(entity);
      case ServerComponentType.slimewisp: return new SlimewispComponent(entity);
      case ServerComponentType.throwingProjectile: return new ThrowingProjectileComponent(entity);
      case ServerComponentType.tribeWarrior: return new TribeWarriorComponent(entity, reader);
      case ServerComponentType.layeredRod: return new LayeredRodComponent(entity, reader);
   }
}