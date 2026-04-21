import { ServerComponentType } from "webgl-test-shared";
import { AIAssignmentComponent, AIAssignmentComponentData } from "./server-components/AIAssignmentComponent";
import { AIHelperComponent, AIHelperComponentData } from "./server-components/AIHelperComponent";
import { AmmoBoxComponent, AmmoBoxComponentData } from "./server-components/AmmoBoxComponent";
import { ProjectileComponent, ProjectileComponentData } from "./server-components/ProjectileComponent";
import { AttackingEntitiesComponent, AttackingEntitiesComponentData } from "./server-components/AttackingEntitiesComponent";
import { BallistaComponent, BallistaComponentData } from "./server-components/BallistaComponent";
import { BarrelComponent, BarrelComponentData } from "./server-components/BarrelComponent";
import { BattleaxeProjectileComponent, BattleaxeProjectileComponentData } from "./server-components/BattleaxeProjectileComponent";
import { BerryBushComponent, BerryBushComponentData } from "./server-components/BerryBushComponent";
import { BerryBushPlantedComponent, BerryBushPlantedComponentData } from "./server-components/BerryBushPlantedComponent";
import { BlueprintComponent, BlueprintComponentData } from "./server-components/BlueprintComponent";
import { BoulderComponent, BoulderComponentData } from "./server-components/BoulderComponent";
import { BracingsComponent, BracingsComponentData } from "./server-components/BracingsComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentData } from "./server-components/BuildingMaterialComponent";
import { CactusComponent, CactusComponentData } from "./server-components/CactusComponent";
import { CampfireComponent, CampfireComponentData } from "./server-components/CampfireComponent";
import { CogwalkerComponent, CogwalkerComponentData } from "./server-components/CogwalkerComponent";
import { CookingComponent, CookingComponentData } from "./server-components/CookingComponent";
import { CowComponent, CowComponentData } from "./server-components/CowComponent";
import { CraftingStationComponent, CraftingStationComponentData } from "./server-components/CraftingStationComponent";
import { DecorationComponent, DecorationComponentData } from "./server-components/DecorationComponent";
import { DoorComponent, DoorComponentData } from "./server-components/DoorComponent";
import { FenceComponent, FenceComponentData } from "./server-components/FenceComponent";
import { FenceGateComponent, FenceGateComponentData } from "./server-components/FenceGateComponent";
import { FireTorchComponent, FireTorchComponentData } from "./server-components/FireTorchComponent";
import { FishComponent, FishComponentData } from "./server-components/FishComponent";
import { FurnaceComponent, FurnaceComponentData } from "./server-components/FurnaceComponent";
import { GlurbHeadSegmentComponent, GlurbHeadSegmentComponentData } from "./server-components/GlurbHeadSegmentComponent";
import { GolemComponent, GolemComponentData } from "./server-components/GolemComponent";
import { GuardianComponent, GuardianComponentData } from "./server-components/GuardianComponent";
import { GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentData } from "./server-components/GuardianGemFragmentProjectileComponent";
import { GuardianGemQuakeComponent, GuardianGemQuakeComponentData } from "./server-components/GuardianGemQuakeComponent";
import { GuardianSpikyBallComponent, GuardianSpikyBallComponentData } from "./server-components/GuardianSpikyBallComponent";
import { HealingTotemComponent, HealingTotemComponentData } from "./server-components/HealingTotemComponent";
import { HealthComponent, HealthComponentData } from "./server-components/HealthComponent";
import { HutComponent, HutComponentData } from "./server-components/HutComponent";
import { IceArrowComponent, IceArrowComponentData } from "./server-components/IceArrowComponent";
import { IceShardComponent, IceShardComponentData } from "./server-components/IceShardComponent";
import { IceSpikesComponent, IceSpikesComponentData } from "./server-components/IceSpikesComponent";
import { IceSpikesPlantedComponent, IceSpikesPlantedComponentData } from "./server-components/IceSpikesPlantedComponent";
import { InventoryComponent, InventoryComponentData } from "./server-components/InventoryComponent";
import { InventoryUseComponent, InventoryUseComponentData } from "./server-components/InventoryUseComponent";
import { ItemComponent, ItemComponentData } from "./server-components/ItemComponent";
import { KrumblidComponent, KrumblidComponentData } from "./server-components/KrumblidComponent";
import { LayeredRodComponent, LayeredRodComponentData } from "./server-components/LayeredRodComponent";
import { MithrilOreNodeComponent, MithrilOreNodeComponentData } from "./server-components/MithrilOreNodeComponent";
import { PebblumComponent, PebblumComponentData } from "./server-components/PebblumComponent";
import { PlantedComponent, PlantedComponentData } from "./server-components/PlantedComponent";
import { PlanterBoxComponent, PlanterBoxComponentData } from "./server-components/PlanterBoxComponent";
import { PlayerComponent, PlayerComponentData } from "./server-components/PlayerComponent";
import { PunjiSticksComponent, PunjiSticksComponentData } from "./server-components/PunjiSticksComponent";
import { ResearchBenchComponent, ResearchBenchComponentData } from "./server-components/ResearchBenchComponent";
import { ScrappyComponent, ScrappyComponentData } from "./server-components/ScrappyComponent";
import { SlimeComponent, SlimeComponentData } from "./server-components/SlimeComponent";
import { SlimeSpitComponent, SlimeSpitComponentData } from "./server-components/SlimeSpitComponent";
import { SlimewispComponent, SlimewispComponentData } from "./server-components/SlimewispComponent";
import { SlingTurretComponent, SlingTurretComponentData } from "./server-components/SlingTurretComponent";
import { SlurbTorchComponent, SlurbTorchComponentData } from "./server-components/SlurbTorchComponent";
import { SnowballComponent, SnowballComponentData } from "./server-components/SnowballComponent";
import { SpearProjectileComponent, SpearProjectileComponentData } from "./server-components/SpearProjectileComponent";
import { SpikesComponent, SpikesComponentData } from "./server-components/SpikesComponent";
import { SpikyBastardComponent, SpikyBastardComponentData } from "./server-components/SpikyBastardComponent";
import { SpitPoisonAreaComponent, SpitPoisonAreaComponentData } from "./server-components/SpitPoisonAreaComponent";
import { StatusEffectComponent, StatusEffectComponentData } from "./server-components/StatusEffectComponent";
import { StructureComponent, StructureComponentData } from "./server-components/StructureComponent";
import { ThrowingProjectileComponent, ThrowingProjectileComponentData } from "./server-components/ThrowingProjectileComponent";
import { TombstoneComponent, TombstoneComponentData } from "./server-components/TombstoneComponent";
import { TotemBannerComponent, TotemBannerComponentData } from "./server-components/TotemBannerComponent";
import { TransformComponent, TransformComponentData } from "./server-components/TransformComponent";
import { TreeComponent, TreeComponentData } from "./server-components/TreeComponent";
import { TreePlantedComponent, TreePlantedComponentData } from "./server-components/TreePlantedComponent";
import { TreeRootBaseComponent, TreeRootBaseComponentData } from "./server-components/TreeRootBaseComponent";
import { TreeRootSegmentComponent, TreeRootSegmentComponentData } from "./server-components/TreeRootSegmentComponent";
import { TribeComponent, TribeComponentData } from "./server-components/TribeComponent";
import { TribesmanComponent, TribesmanComponentData } from "./server-components/TribesmanComponent";
import { TribesmanAIComponent, TribesmanAIComponentData } from "./server-components/TribesmanAIComponent";
import { TribeWarriorComponent, TribeWarriorComponentData } from "./server-components/TribeWarriorComponent";
import { TunnelComponent, TunnelComponentData } from "./server-components/TunnelComponent";
import { TurretComponent, TurretComponentData } from "./server-components/TurretComponent";
import { YetiComponent, YetiComponentData } from "./server-components/YetiComponent";
import { ZombieComponent, ZombieComponentData } from "./server-components/ZombieComponent";
import { TribeMemberComponent, TribeMemberComponentData } from "./server-components/TribeMemberComponent";
import { AutomatonAssemblerComponent, AutomatonAssemblerComponentData } from "./server-components/AutomatonAssemblerComponent";
import { MithrilAnvilComponent, MithrilAnvilComponentData } from "./server-components/MithrilAnvilComponent";
import { RideableComponent, RideableComponentData } from "./server-components/RideableComponent";
import { SlingTurretRockComponent, SlingTurretRockComponentData } from "./server-components/SlingTurretRockComponent";
import { TamingComponent, TamingComponentData } from "./server-components/TamingComponent";
import { LootComponent, LootComponentData } from "./server-components/LootComponent";
import { GlurbSegmentComponent, GlurbSegmentComponentData } from "./server-components/GlurbSegmentComponent";
import { GlurbBodySegmentComponent, GlurbBodySegmentComponentData } from "./server-components/GlurbBodySegmentComponent";
import { FleshSwordComponent, FleshSwordComponentData } from "./server-components/FleshSwordComponent";
import { MossComponent, MossComponentData } from "./server-components/MossComponent";
import { FloorSignComponent, FloorSignComponentData } from "./server-components/FloorSignComponent";
import { DesertBushLivelyComponent, DesertBushLivelyComponentData } from "./server-components/DesertBushLivelyComponent";
import { DesertBushSandyComponent, DesertBushSandyComponentData } from "./server-components/DesertBushSandyComponent";
import { DesertSmallWeedComponent, DesertSmallWeedComponentData } from "./server-components/DesertSmallWeedComponent";
import { DesertShrubComponent, DesertShrubComponentData } from "./server-components/DesertShrubComponent";
import { TumbleweedLiveComponent, TumbleweedLiveComponentData } from "./server-components/TumbleweedLiveComponent";
import { TumbleweedDeadComponent, TumbleweedDeadComponentData } from "./server-components/TumbleweedDeadComponent";
import { PalmTreeComponent, PalmTreeComponentData } from "./server-components/PalmTreeComponent";
import { PricklyPearComponent, PricklyPearComponentData } from "./server-components/PricklyPearComponent";
import { PricklyPearFragmentProjectileComponent, PricklyPearFragmentProjectileComponentData } from "./server-components/PricklyPearFragmentProjectileComponent";
import { EnergyStomachComponent, EnergyStomachComponentData } from "./server-components/EnergyStomachComponent";
import { EnergyStoreComponent, EnergyStoreComponentData } from "./server-components/EnergyStoreComponent";
import { DustfleaComponent, DustfleaComponentData } from "./server-components/DustfleaComponent";
import { SandstoneRockComponent, SandstoneRockComponentData } from "./server-components/SandstoneRockComponent";
import { OkrenComponent, OkrenComponentData } from "./server-components/OkrenComponent";
import { DustfleaMorphCocoonComponent, DustfleaMorphCocoonComponentData } from "./server-components/DustfleaMorphCocoonComponent";
import { SandBallComponent, SandBallComponentData } from "./server-components/SandBallComponent";
import { KrumblidMorphCocoonComponent, KrumblidMorphCocoonComponentData } from "./server-components/KrumblidMorphCocoonComponent";
import { OkrenTongueComponent, OkrenTongueComponentData } from "./server-components/OkrenTongueComponent";
import { AIPathfindingComponent, AIPathfindingComponentData } from "./server-components/AIPathfindingComponent";
import { DustfleaEggComponent, DustfleaEggComponentData } from "./server-components/DustfleaEggComponent";
import { OkrenClawComponent, OkrenClawComponentData } from "./server-components/OkrenClawComponent";
import { SpruceTreeComponent, SpruceTreeComponentData } from "./server-components/SpruceTreeComponent";
import { TundraRockComponent, TundraRockComponentData } from "./server-components/TundraRockComponent";
import { SnowberryBushComponent, SnowberryBushComponentData } from "./server-components/SnowberryBushComponent";
import { SnobeComponent, SnobeComponentData } from "./server-components/SnobeComponent";
import { SnobeMoundComponent, SnobeMoundComponentData } from "./server-components/SnobeMoundComponent";
import { TundraRockFrozenComponent, TundraRockFrozenComponentData } from "./server-components/TundraRockFrozenComponent";
import { InguSerpentComponent, InguSerpentComponentData } from "./server-components/InguSerpentComponent";
import { TukmokComponent, TukmokComponentData } from "./server-components/TukmokComponent";
import { TukmokTrunkComponent, TukmokTrunkComponentData } from "./server-components/TukmokTrunkComponent";
import { TukmokTailClubComponent, TukmokTailClubComponentData } from "./server-components/TukmokTailClubComponent";
import { TukmokSpurComponent, TukmokSpurComponentData } from "./server-components/TukmokSpurComponent";
import { InguYetuksnoglurblidokowfleaComponent, InguYetuksnoglurblidokowfleaComponentData } from "./server-components/InguYetuksnoglurblidokowfleaComponent";
import { InguYetuksnoglurblidokowfleaSeekerHeadComponent, InguYetuksnoglurblidokowfleaSeekerHeadComponentData } from "./server-components/InguYetuksnoglurblidokowfleaSeekerHeadComponent";
import { InguYetukLaserComponent, InguYetukLaserComponentData } from "./server-components/InguYetukLaserComponent";
import { RiverSteppingStoneComponent, RiverSteppingStoneComponentData } from "./server-components/RiverSteppingStoneComponent";
import { HeldItemComponent, HeldItemComponentData } from "./server-components/HeldItemComponent";

// @CLEANUP bad bad bad.

interface ServerComponentRecord {
   [ServerComponentType.transform]: [TransformComponent, TransformComponentData],
   [ServerComponentType.cow]: [CowComponent, CowComponentData],
   [ServerComponentType.turret]: [TurretComponent, TurretComponentData],
   [ServerComponentType.tribe]: [TribeComponent, TribeComponentData],
   [ServerComponentType.inventory]: [InventoryComponent, InventoryComponentData],
   [ServerComponentType.ammoBox]: [AmmoBoxComponent, AmmoBoxComponentData],
   [ServerComponentType.slime]: [SlimeComponent, SlimeComponentData],
   [ServerComponentType.golem]: [GolemComponent, GolemComponentData],
   [ServerComponentType.statusEffect]: [StatusEffectComponent, StatusEffectComponentData],
   [ServerComponentType.cactus]: [CactusComponent, CactusComponentData],
   [ServerComponentType.health]: [HealthComponent, HealthComponentData],
   [ServerComponentType.researchBench]: [ResearchBenchComponent, ResearchBenchComponentData],
   [ServerComponentType.berryBush]: [BerryBushComponent, BerryBushComponentData],
   [ServerComponentType.inventoryUse]: [InventoryUseComponent, InventoryUseComponentData],
   [ServerComponentType.zombie]: [ZombieComponent, ZombieComponentData],
   [ServerComponentType.player]: [PlayerComponent, PlayerComponentData],
   [ServerComponentType.item]: [ItemComponent, ItemComponentData],
   [ServerComponentType.fleshSwordItem]: [FleshSwordComponent, FleshSwordComponentData],
   [ServerComponentType.tombstone]: [TombstoneComponent, TombstoneComponentData],
   [ServerComponentType.tree]: [TreeComponent, TreeComponentData],
   [ServerComponentType.blueprint]: [BlueprintComponent, BlueprintComponentData],
   [ServerComponentType.projectile]: [ProjectileComponent, ProjectileComponentData],
   [ServerComponentType.iceArrow]: [IceArrowComponent, IceArrowComponentData],
   [ServerComponentType.yeti]: [YetiComponent, YetiComponentData],
   [ServerComponentType.totemBanner]: [TotemBannerComponent, TotemBannerComponentData],
   [ServerComponentType.cooking]: [CookingComponent, CookingComponentData],
   [ServerComponentType.hut]: [HutComponent, HutComponentData],
   [ServerComponentType.snowball]: [SnowballComponent, SnowballComponentData],
   [ServerComponentType.fish]: [FishComponent, FishComponentData],
   [ServerComponentType.slimeSpit]: [SlimeSpitComponent, SlimeSpitComponentData],
   [ServerComponentType.door]: [DoorComponent, DoorComponentData],
   [ServerComponentType.tribesman]: [TribesmanComponent, TribesmanComponentData],
   [ServerComponentType.tribesmanAI]: [TribesmanAIComponent, TribesmanAIComponentData],
   [ServerComponentType.tunnel]: [TunnelComponent, TunnelComponentData],
   [ServerComponentType.buildingMaterial]: [BuildingMaterialComponent, BuildingMaterialComponentData],
   [ServerComponentType.spikes]: [SpikesComponent, SpikesComponentData],
   [ServerComponentType.punjiSticks]: [PunjiSticksComponent, PunjiSticksComponentData],
   [ServerComponentType.tribeMember]: [TribeMemberComponent, TribeMemberComponentData],
   [ServerComponentType.healingTotem]: [HealingTotemComponent, HealingTotemComponentData],
   [ServerComponentType.planterBox]: [PlanterBoxComponent, PlanterBoxComponentData],
   [ServerComponentType.planted]: [PlantedComponent, PlantedComponentData],
   [ServerComponentType.treePlanted]: [TreePlantedComponent, TreePlantedComponentData],
   [ServerComponentType.berryBushPlanted]: [BerryBushPlantedComponent, BerryBushPlantedComponentData],
   [ServerComponentType.iceSpikesPlanted]: [IceSpikesPlantedComponent, IceSpikesPlantedComponentData],
   [ServerComponentType.structure]: [StructureComponent, StructureComponentData],
   [ServerComponentType.fence]: [FenceComponent, FenceComponentData],
   [ServerComponentType.fenceGate]: [FenceGateComponent, FenceGateComponentData],
   [ServerComponentType.craftingStation]: [CraftingStationComponent, CraftingStationComponentData],
   [ServerComponentType.aiHelper]: [AIHelperComponent, AIHelperComponentData],
   [ServerComponentType.boulder]: [BoulderComponent, BoulderComponentData],
   [ServerComponentType.iceShard]: [IceShardComponent, IceShardComponentData],
   [ServerComponentType.iceSpikes]: [IceSpikesComponent, IceSpikesComponentData],
   [ServerComponentType.pebblum]: [PebblumComponent, PebblumComponentData],
   [ServerComponentType.slimewisp]: [SlimewispComponent, SlimewispComponentData],
   [ServerComponentType.throwingProjectile]: [ThrowingProjectileComponent, ThrowingProjectileComponentData],
   [ServerComponentType.tribeWarrior]: [TribeWarriorComponent, TribeWarriorComponentData],
   [ServerComponentType.layeredRod]: [LayeredRodComponent, LayeredRodComponentData],
   [ServerComponentType.decoration]: [DecorationComponent, DecorationComponentData],
   [ServerComponentType.riverSteppingStone]: [RiverSteppingStoneComponent, RiverSteppingStoneComponentData],
   [ServerComponentType.spitPoisonArea]: [SpitPoisonAreaComponent, SpitPoisonAreaComponentData],
   [ServerComponentType.battleaxeProjectile]: [BattleaxeProjectileComponent, BattleaxeProjectileComponentData],
   [ServerComponentType.spearProjectile]: [SpearProjectileComponent, SpearProjectileComponentData],
   [ServerComponentType.krumblid]: [KrumblidComponent, KrumblidComponentData],
   [ServerComponentType.guardian]: [GuardianComponent, GuardianComponentData],
   [ServerComponentType.guardianGemQuake]: [GuardianGemQuakeComponent, GuardianGemQuakeComponentData],
   [ServerComponentType.guardianGemFragmentProjectile]: [GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentData],
   [ServerComponentType.guardianSpikyBall]: [GuardianSpikyBallComponent, GuardianSpikyBallComponentData],
   [ServerComponentType.bracings]: [BracingsComponent, BracingsComponentData],
   [ServerComponentType.ballista]: [BallistaComponent, BallistaComponentData],
   [ServerComponentType.slingTurret]: [SlingTurretComponent, SlingTurretComponentData],
   [ServerComponentType.barrel]: [BarrelComponent, BarrelComponentData],
   [ServerComponentType.campfire]: [CampfireComponent, CampfireComponentData],
   [ServerComponentType.furnace]: [FurnaceComponent, FurnaceComponentData],
   [ServerComponentType.fireTorch]: [FireTorchComponent, FireTorchComponentData],
   [ServerComponentType.spikyBastard]: [SpikyBastardComponent, SpikyBastardComponentData],
   [ServerComponentType.glurbHeadSegment]: [GlurbHeadSegmentComponent, GlurbHeadSegmentComponentData],
   [ServerComponentType.glurbBodySegment]: [GlurbBodySegmentComponent, GlurbBodySegmentComponentData],
   [ServerComponentType.glurbSegment]: [GlurbSegmentComponent, GlurbSegmentComponentData],
   [ServerComponentType.slurbTorch]: [SlurbTorchComponent, SlurbTorchComponentData],
   [ServerComponentType.attackingEntities]: [AttackingEntitiesComponent, AttackingEntitiesComponentData],
   [ServerComponentType.aiAssignment]: [AIAssignmentComponent, AIAssignmentComponentData],
   [ServerComponentType.treeRootBase]: [TreeRootBaseComponent, TreeRootBaseComponentData],
   [ServerComponentType.treeRootSegment]: [TreeRootSegmentComponent, TreeRootSegmentComponentData],
   [ServerComponentType.mithrilOreNode]: [MithrilOreNodeComponent, MithrilOreNodeComponentData],
   [ServerComponentType.scrappy]: [ScrappyComponent, ScrappyComponentData],
   [ServerComponentType.cogwalker]: [CogwalkerComponent, CogwalkerComponentData],
   [ServerComponentType.automatonAssembler]: [AutomatonAssemblerComponent, AutomatonAssemblerComponentData],
   [ServerComponentType.mithrilAnvil]: [MithrilAnvilComponent, MithrilAnvilComponentData],
   [ServerComponentType.rideable]: [RideableComponent, RideableComponentData],
   [ServerComponentType.heldItem]: [HeldItemComponent, HeldItemComponentData],
   [ServerComponentType.slingTurretRock]: [SlingTurretRockComponent, SlingTurretRockComponentData],
   [ServerComponentType.taming]: [TamingComponent, TamingComponentData],
   [ServerComponentType.loot]: [LootComponent, LootComponentData],
   [ServerComponentType.moss]: [MossComponent, MossComponentData],
   [ServerComponentType.floorSign]: [FloorSignComponent, FloorSignComponentData],
   [ServerComponentType.desertBushLively]: [DesertBushLivelyComponent, DesertBushLivelyComponentData],
   [ServerComponentType.desertBushSandy]: [DesertBushSandyComponent, DesertBushSandyComponentData],
   [ServerComponentType.desertSmallWeed]: [DesertSmallWeedComponent, DesertSmallWeedComponentData],
   [ServerComponentType.desertShrub]: [DesertShrubComponent, DesertShrubComponentData],
   [ServerComponentType.tumbleweedLive]: [TumbleweedLiveComponent, TumbleweedLiveComponentData],
   [ServerComponentType.tumbleweedDead]: [TumbleweedDeadComponent, TumbleweedDeadComponentData],
   [ServerComponentType.palmTree]: [PalmTreeComponent, PalmTreeComponentData],
   [ServerComponentType.pricklyPear]: [PricklyPearComponent, PricklyPearComponentData],
   [ServerComponentType.pricklyPearFragmentProjectile]: [PricklyPearFragmentProjectileComponent, PricklyPearFragmentProjectileComponentData],
   [ServerComponentType.energyStore]: [EnergyStoreComponent, EnergyStoreComponentData],
   [ServerComponentType.energyStomach]: [EnergyStomachComponent, EnergyStomachComponentData],
   [ServerComponentType.dustflea]: [DustfleaComponent, DustfleaComponentData],
   [ServerComponentType.sandstoneRock]: [SandstoneRockComponent, SandstoneRockComponentData],
   [ServerComponentType.okren]: [OkrenComponent, OkrenComponentData],
   [ServerComponentType.okrenClaw]: [OkrenClawComponent, OkrenClawComponentData],
   [ServerComponentType.dustfleaMorphCocoon]: [DustfleaMorphCocoonComponent, DustfleaMorphCocoonComponentData],
   [ServerComponentType.sandBall]: [SandBallComponent, SandBallComponentData],
   [ServerComponentType.krumblidMorphCocoon]: [KrumblidMorphCocoonComponent, KrumblidMorphCocoonComponentData],
   [ServerComponentType.okrenTongue]: [OkrenTongueComponent, OkrenTongueComponentData],
   [ServerComponentType.aiPathfinding]: [AIPathfindingComponent, AIPathfindingComponentData],
   [ServerComponentType.dustfleaEgg]: [DustfleaEggComponent, DustfleaEggComponentData],
   [ServerComponentType.spruceTree]: [SpruceTreeComponent, SpruceTreeComponentData],
   [ServerComponentType.tundraRock]: [TundraRockComponent, TundraRockComponentData],
   [ServerComponentType.tundraRockFrozen]: [TundraRockFrozenComponent, TundraRockFrozenComponentData],
   [ServerComponentType.snowberryBush]: [SnowberryBushComponent, SnowberryBushComponentData],
   [ServerComponentType.snobe]: [SnobeComponent, SnobeComponentData],
   [ServerComponentType.snobeMound]: [SnobeMoundComponent, SnobeMoundComponentData],
   [ServerComponentType.inguSerpent]: [InguSerpentComponent, InguSerpentComponentData],
   [ServerComponentType.tukmok]: [TukmokComponent, TukmokComponentData],
   [ServerComponentType.tukmokTrunk]: [TukmokTrunkComponent, TukmokTrunkComponentData],
   [ServerComponentType.tukmokTailClub]: [TukmokTailClubComponent, TukmokTailClubComponentData],
   [ServerComponentType.tukmokSpur]: [TukmokSpurComponent, TukmokSpurComponentData],
   [ServerComponentType.inguYetuksnoglurblidokowflea]: [InguYetuksnoglurblidokowfleaComponent, InguYetuksnoglurblidokowfleaComponentData],
   [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: [InguYetuksnoglurblidokowfleaSeekerHeadComponent, InguYetuksnoglurblidokowfleaSeekerHeadComponentData],
   [ServerComponentType.inguYetukLaser]: [InguYetukLaserComponent, InguYetukLaserComponentData],
}

export type ServerComponent<T extends ServerComponentType> = ServerComponentRecord[T][0];
export type ServerComponentData<T extends ServerComponentType> = ServerComponentRecord[T][1];