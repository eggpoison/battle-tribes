import { ServerComponentType } from "battletribes-shared/components";
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
import BoulderComponent from "./BoulderComponent";
import AIHelperComponent from "./AIHelperComponent";
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
import DecorationComponent from "./DecorationComponent";
import BattleaxeProjectileComponent from "./BattleaxeProjectileComponent";
import SpearProjectileComponent from "./SpearProjectileComponent";
import KrumblidComponent from "./KrumblidComponent";
import SpitPoisonAreaComponent from "./SpitPoisonAreaComponent";
import PunjiSticksComponent from "./PunjiSticksComponent";
import IceArrowComponent from "./IceArrowComponent";
import DamageBoxComponent from "./DamageBoxComponent";
import RandomSoundComponent from "./client-components/RandomSoundComponent";
import GuardianComponent from "./GuardianComponent";
import { GuardianGemQuakeComponent } from "./GuardianGemQuakeComponent";
import { GuardianGemFragmentProjectileComponent } from "./GuardianGemFragmentProjectileComponent";
import { GuardianSpikyBallComponent } from "./GuardianSpikyBallComponent";

export enum ClientComponentType {
   equipment,
   footprint,
   randomSound
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
   [ServerComponentType.iceArrow]: (): IceArrowComponent => 0 as any,
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
   [ServerComponentType.punjiSticks]: (): PunjiSticksComponent => 0 as any,
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
   [ServerComponentType.escapeAI]: (): EscapeAIComponent => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponent => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponent => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponent => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponent => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponent => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponent => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponent => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponent => 0 as any,
   [ServerComponentType.damageBox]: (): DamageBoxComponent => 0 as any,
   [ServerComponentType.guardian]: (): GuardianComponent => 0 as any,
   [ServerComponentType.guardianGemQuake]: (): GuardianGemQuakeComponent => 0 as any,
   [ServerComponentType.guardianGemFragmentProjectile]: (): GuardianGemFragmentProjectileComponent => 0 as any,
   [ServerComponentType.guardianSpikyBall]: (): GuardianSpikyBallComponent => 0 as any
} satisfies Record<ServerComponentType, () => ServerComponent>;

export const ClientComponents = {
   [ClientComponentType.equipment]: (): EquipmentComponent => 0 as any,
   [ClientComponentType.footprint]: (): FootprintComponent => 0 as any,
   [ClientComponentType.randomSound]: (): RandomSoundComponent => 0 as any
} satisfies Record<ClientComponentType, () => Component>;

export type ServerComponentClass<T extends ServerComponentType> = ReturnType<typeof ServerComponents[T]>;
export type ClientComponentClass<T extends ClientComponentType> = ReturnType<typeof ClientComponents[T]>;