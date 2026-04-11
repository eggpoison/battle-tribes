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
import { GolemComponent } from "./components/GolemComponent";
import { HealingTotemComponent } from "./components/HealingTotemComponent";
import { HealthComponent } from "./components/HealthComponent";
import { HutComponent } from "./components/HutComponent";
import { InventoryComponent } from "./components/InventoryComponent";
import { InventoryUseComponent } from "./components/InventoryUseComponent";
import { ItemComponent } from "./components/ItemComponent";
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
import { AIHelperComponent } from "./components/AIHelperComponent";
import { IceShardComponent } from "./components/IceShardComponent";
import { IceSpikesComponent } from "./components/IceSpikesComponent";
import { PebblumComponent } from "./components/PebblumComponent";
import { SlimewispComponent } from "./components/SlimewispComponent";
import { ThrowingProjectileComponent } from "./components/ThrowingProjectileComponent";
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
import { GuardianComponent } from "./components/GuardianComponent";
import { GuardianGemQuakeComponent } from "./components/GuardianGemQuakeComponent";
import { GuardianGemFragmentProjectileComponent } from "./components/GuardianGemFragmentProjectileComponent";
import { GuardianSpikyBallComponent } from "./components/GuardianSpikyBallComponent";
import { EntityType } from "battletribes-shared/entities";
import { BracingsComponent } from "./components/BracingsComponent";
import { BallistaComponent } from "./components/BallistaComponent";
import { SlingTurretComponent } from "./components/SlingTurretComponent";
import { BarrelComponent } from "./components/BarrelComponent";
import { CampfireComponent } from "./components/CampfireComponent";
import { FurnaceComponent } from "./components/FurnaceComponent";
import { FireTorchComponent } from "./components/FireTorchComponent";
import { SpikyBastardComponent } from "./components/SpikyBastardComponent";
import { GlurbHeadSegmentComponent } from "./components/GlurbHeadSegmentComponent";
import { SlurbTorchComponent } from "./components/SlurbTorchComponent";
import { AttackingEntitiesComponent } from "./components/AttackingEntitiesComponent";
import { TreeRootBaseComponent } from "./components/TreeRootBaseComponent";
import { TreeRootSegmentComponent } from "./components/TreeRootSegmentComponent";
import { AIAssignmentComponent } from "./components/AIAssignmentComponent";
import { PlantedComponent } from "./components/PlantedComponent";
import { TreePlantedComponent } from "./components/TreePlantedComponent";
import { BerryBushPlantedComponent } from "./components/BerryBushPlantedComponent";
import { IceSpikesPlantedComponent } from "./components/IceSpikesPlantedComponent";
import { Light } from "./lights";
import { MithrilOreNodeComponent } from "./components/MithrilOreNodeComponent";
import { ScrappyComponent } from "./components/ScrappyComponent";
import { CogwalkerComponent } from "./components/CogwalkerComponent";
import { TribesmanComponent } from "./components/TribesmanComponent";
import { AutomatonAssemblerComponent } from "./components/AutomatonAssemblerComponent";
import { MithrilAnvilComponent } from "./components/MithrilAnvilComponent";
import { RideableComponent } from "./components/RideableComponent";
import { SlingTurretRockComponent } from "./components/SlingTurretRockComponent";
import { TamingComponent } from "./components/TamingComponent";
import { LootComponent } from "./components/LootComponent";
import { GlurbBodySegmentComponent } from "./components/GlurbBodySegmentComponent";
import { GlurbSegmentComponent } from "./components/GlurbSegmentComponent";
import { FleshSwordItemComponent } from "./components/FleshSwordItemComponent";
import { HitboxAngularTether, Hitbox } from "./hitboxes";
import { MossComponent } from "./components/MossComponent";
import { FloorSignComponent } from "./components/FloorSignComponent";
import { DesertBushLivelyComponent } from "./components/DesertBushLivelyComponent";
import { DesertBushSandyComponent } from "./components/DesertBushSandyComponent";
import { DesertSmallWeedComponent } from "./components/DesertSmallWeedComponent";
import { DesertShrubComponent } from "./components/DesertShrubComponent";
import { TumbleweedLiveComponent } from "./components/TumbleweedLiveComponent";
import { TumbleweedDeadComponent } from "./components/TumbleweedDeadComponent";
import { PalmTreeComponent } from "./components/PalmTreeComponent";
import { PricklyPearComponent } from "./components/PricklyPearComponent";
import { PricklyPearFragmentProjectileComponent } from "./components/PricklyPearFragmentComponent";
import { EnergyStomachComponent } from "./components/EnergyStomachComponent";
import { EnergyStoreComponent } from "./components/EnergyStoreComponent";
import { DustfleaComponent } from "./components/DustfleaComponent";
import { SandstoneRockComponent } from "./components/SandstoneRockComponent";
import { OkrenComponent } from "./components/OkrenComponent";
import { DustfleaMorphCocoonComponent } from "./components/DustfleaMorphCocoonComponent";
import { SandBallComponent } from "./components/SandBallComponent";
import { KrumblidMorphCocoonComponent } from "./components/KrumblidMorphCocoonComponent";
import { OkrenTongueComponent } from "./components/OkrenTongueComponent";
import { AIPathfindingComponent } from "./components/AIPathfindingComponent";
import { DustfleaEggComponent } from "./components/DustfleaEggComponent";
import { OkrenClawComponent } from "./components/OkrenClawComponent";
import { SpruceTreeComponent } from "./components/SpruceTreeComponent";
import { TundraRockComponent } from "./components/TundraRockComponent";
import { SnowberryBushComponent } from "./components/SnowberryBushComponent";
import { SnobeComponent } from "./components/SnobeComponent";
import { SnobeMoundComponent } from "./components/SnobeMoundComponent";
import { TundraRockFrozenComponent } from "./components/TundraRockFrozenComponent";
import { InguSerpentComponent } from "./components/InguSerpentComponent";
import { TukmokComponent } from "./components/TukmokComponent";
import { TukmokTailClubComponent } from "./components/TukmokTailClubComponent";
import { TukmokTrunkComponent } from "./components/TukmokTrunkComponent";
import { TukmokSpurComponent } from "./components/TukmokSpurComponent";
import { InguYetuksnoglurblidokowfleaComponent } from "./components/InguYetuksnoglurblidokowfleaComponent";
import { InguYetuksnoglurblidokowfleaSeekerHeadComponent } from "./components/InguYetuksnoglurblidokowfleaSeekerHeadComponent";
import { InguYetukLaserComponent } from "./components/InguYetukLaserComponent";
import { RiverSteppingStoneComponent } from "./components/RiverSteppingStoneComponent";
import { HeldItemComponent } from "./components/HeldItemComponent";

// @Cleanup @Robustness: find better way to do this
// @Cleanup: see if you can remove the arrow functions
// @GARBAGE only used for getting its type
interface ComponentTypeMap {
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
   [ServerComponentType.researchBench]: ResearchBenchComponent,
   [ServerComponentType.berryBush]: BerryBushComponent,
   [ServerComponentType.inventoryUse]: InventoryUseComponent,
   [ServerComponentType.zombie]: ZombieComponent,
   [ServerComponentType.player]: PlayerComponent,
   [ServerComponentType.item]: ItemComponent,
   [ServerComponentType.fleshSwordItem]: FleshSwordItemComponent,
   [ServerComponentType.tombstone]: TombstoneComponent,
   [ServerComponentType.tree]: TreeComponent,
   [ServerComponentType.blueprint]: BlueprintComponent,
   [ServerComponentType.boulder]: BoulderComponent,
   [ServerComponentType.yeti]: YetiComponent,
   [ServerComponentType.totemBanner]: TotemBannerComponent,
   [ServerComponentType.cooking]: CookingComponent,
   [ServerComponentType.hut]: HutComponent,
   [ServerComponentType.snowball]: SnowballComponent,
   [ServerComponentType.fish]: FishComponent,
   [ServerComponentType.slimeSpit]: SlimeSpitComponent,
   [ServerComponentType.door]: DoorComponent,
   [ServerComponentType.tribesman]: TribesmanComponent,
   [ServerComponentType.tribesmanAI]: TribesmanAIComponent,
   [ServerComponentType.tunnel]: TunnelComponent,
   [ServerComponentType.buildingMaterial]: BuildingMaterialComponent,
   [ServerComponentType.spikes]: SpikesComponent,
   [ServerComponentType.punjiSticks]: PunjiSticksComponent,
   [ServerComponentType.tribeMember]: TribeMemberComponent,
   [ServerComponentType.healingTotem]: HealingTotemComponent,
   [ServerComponentType.planterBox]: PlanterBoxComponent,
   [ServerComponentType.planted]: PlantedComponent,
   [ServerComponentType.treePlanted]: TreePlantedComponent,
   [ServerComponentType.berryBushPlanted]: BerryBushPlantedComponent,
   [ServerComponentType.iceSpikesPlanted]: IceSpikesPlantedComponent,
   [ServerComponentType.structure]: StructureComponent,
   [ServerComponentType.fence]: FenceComponent,
   [ServerComponentType.fenceGate]: FenceGateComponent,
   [ServerComponentType.iceShard]: IceShardComponent,
   [ServerComponentType.iceSpikes]: IceSpikesComponent,
   [ServerComponentType.pebblum]: PebblumComponent,
   [ServerComponentType.slimewisp]: SlimewispComponent,
   [ServerComponentType.throwingProjectile]: ThrowingProjectileComponent,
   [ServerComponentType.tribeWarrior]: TribeWarriorComponent,
   [ServerComponentType.craftingStation]: CraftingStationComponent,
   [ServerComponentType.transform]: TransformComponent,
   [ServerComponentType.projectile]: ProjectileComponent,
   [ServerComponentType.iceArrow]: IceArrowComponent,
   [ServerComponentType.layeredRod]: LayeredRodComponent,
   [ServerComponentType.decoration]: DecorationComponent,
   [ServerComponentType.riverSteppingStone]: RiverSteppingStoneComponent,
   [ServerComponentType.spitPoisonArea]: SpitPoisonAreaComponent,
   [ServerComponentType.battleaxeProjectile]: BattleaxeProjectileComponent,
   [ServerComponentType.spearProjectile]: SpearProjectileComponent,
   [ServerComponentType.krumblid]: KrumblidComponent,
   [ServerComponentType.guardian]: GuardianComponent,
   [ServerComponentType.guardianGemQuake]: GuardianGemQuakeComponent,
   [ServerComponentType.guardianGemFragmentProjectile]: GuardianGemFragmentProjectileComponent,
   [ServerComponentType.guardianSpikyBall]: GuardianSpikyBallComponent,
   [ServerComponentType.bracings]: BracingsComponent,
   [ServerComponentType.ballista]: BallistaComponent,
   [ServerComponentType.slingTurret]: SlingTurretComponent,
   [ServerComponentType.barrel]: BarrelComponent,
   [ServerComponentType.campfire]: CampfireComponent,
   [ServerComponentType.furnace]: FurnaceComponent,
   [ServerComponentType.fireTorch]: FireTorchComponent,
   [ServerComponentType.spikyBastard]: SpikyBastardComponent,
   [ServerComponentType.glurbHeadSegment]: GlurbHeadSegmentComponent,
   [ServerComponentType.glurbBodySegment]: GlurbBodySegmentComponent,
   [ServerComponentType.glurbSegment]: GlurbSegmentComponent,
   [ServerComponentType.slurbTorch]: SlurbTorchComponent,
   [ServerComponentType.attackingEntities]: AttackingEntitiesComponent,
   [ServerComponentType.aiAssignment]: AIAssignmentComponent,
   [ServerComponentType.treeRootBase]: TreeRootBaseComponent,
   [ServerComponentType.treeRootSegment]: TreeRootSegmentComponent,
   [ServerComponentType.mithrilOreNode]: MithrilOreNodeComponent,
   [ServerComponentType.scrappy]: ScrappyComponent,
   [ServerComponentType.cogwalker]: CogwalkerComponent,
   [ServerComponentType.automatonAssembler]: AutomatonAssemblerComponent,
   [ServerComponentType.mithrilAnvil]: MithrilAnvilComponent,
   [ServerComponentType.rideable]: RideableComponent,
   [ServerComponentType.heldItem]: HeldItemComponent,
   [ServerComponentType.slingTurretRock]: SlingTurretRockComponent,
   [ServerComponentType.taming]: TamingComponent,
   [ServerComponentType.loot]: LootComponent,
   [ServerComponentType.moss]: MossComponent,
   [ServerComponentType.floorSign]: FloorSignComponent,
   [ServerComponentType.desertBushLively]: DesertBushLivelyComponent,
   [ServerComponentType.desertBushSandy]: DesertBushSandyComponent,
   [ServerComponentType.desertSmallWeed]: DesertSmallWeedComponent,
   [ServerComponentType.desertShrub]: DesertShrubComponent,
   [ServerComponentType.tumbleweedLive]: TumbleweedLiveComponent,
   [ServerComponentType.tumbleweedDead]: TumbleweedDeadComponent,
   [ServerComponentType.palmTree]: PalmTreeComponent,
   [ServerComponentType.pricklyPear]: PricklyPearComponent,
   [ServerComponentType.pricklyPearFragmentProjectile]: PricklyPearFragmentProjectileComponent,
   [ServerComponentType.energyStore]: EnergyStoreComponent,
   [ServerComponentType.energyStomach]: EnergyStomachComponent,
   [ServerComponentType.dustflea]: DustfleaComponent,
   [ServerComponentType.sandstoneRock]: SandstoneRockComponent,
   [ServerComponentType.okren]: OkrenComponent,
   [ServerComponentType.okrenClaw]: OkrenClawComponent,
   [ServerComponentType.dustfleaMorphCocoon]: DustfleaMorphCocoonComponent,
   [ServerComponentType.sandBall]: SandBallComponent,
   [ServerComponentType.krumblidMorphCocoon]: KrumblidMorphCocoonComponent,
   [ServerComponentType.okrenTongue]: OkrenTongueComponent,
   [ServerComponentType.aiPathfinding]: AIPathfindingComponent,
   [ServerComponentType.dustfleaEgg]: DustfleaEggComponent,
   [ServerComponentType.spruceTree]: SpruceTreeComponent,
   [ServerComponentType.tundraRock]: TundraRockComponent,
   [ServerComponentType.tundraRockFrozen]: TundraRockFrozenComponent,
   [ServerComponentType.snowberryBush]: SnowberryBushComponent,
   [ServerComponentType.snobe]: SnobeComponent,
   [ServerComponentType.snobeMound]: SnobeMoundComponent,
   [ServerComponentType.inguSerpent]: InguSerpentComponent,
   [ServerComponentType.tukmok]: TukmokComponent,
   [ServerComponentType.tukmokTrunk]: TukmokTrunkComponent,
   [ServerComponentType.tukmokTailClub]: TukmokTailClubComponent,
   [ServerComponentType.tukmokSpur]: TukmokSpurComponent,
   [ServerComponentType.inguYetuksnoglurblidokowflea]: InguYetuksnoglurblidokowfleaComponent,
   [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: InguYetuksnoglurblidokowfleaSeekerHeadComponent,
   [ServerComponentType.inguYetukLaser]: InguYetukLaserComponent,
}

export interface LightCreationInfo {
   readonly light: Light;
   readonly attachedHitbox: Hitbox;
}

type Component<T extends ServerComponentType> = ComponentTypeMap[T];

type EntityComponents = ReadonlyArray<Component<ServerComponentType>>;

// @ASS @ASS @ASS all of this

export interface EntityConfigAttachInfo {
   readonly attachedHitbox: Hitbox;
   readonly parentHitbox: Hitbox;
   readonly isPartOfParent: boolean;
}

export interface EntityConfigAttachInfoWithTether extends EntityConfigAttachInfo {
   readonly idealDistance: number;
   readonly springConstant: number;
   readonly damping: number;
   readonly affectsOriginHitbox: boolean;
   readonly angularTether?: HitboxAngularTether;
}

export interface ChildConfigAttachInfo {
   readonly entityConfig: EntityConfig;
   // @CLEANUP: i've basically copy pasted EntityConfigAttach into here but without the 'parent' field cuz wee can't know when we'ere creating it
   readonly attachedHitbox: Hitbox;
   readonly parentHitbox: Hitbox;
   readonly isPartOfParent: boolean;
}

export interface EntityConfig {
   readonly entityType: EntityType;
   readonly components: EntityComponents;
   readonly lights: ReadonlyArray<LightCreationInfo>;
   /** If present, notes that upon being added to the world it should immediately be attached to an entity. */
   attachInfo?: EntityConfigAttachInfo | EntityConfigAttachInfoWithTether;
   /** Any child entities' configs. */
   childConfigs?: ReadonlyArray<ChildConfigAttachInfo>;
}

export function getConfigComponent<T extends ServerComponentType>(components: EntityComponents, componentTypes: ReadonlyArray<ServerComponentType>, componentType: T): Component<T> {
   for (let i = 0; i < componentTypes.length; i++) {
      const currentComponentType = componentTypes[i];
      if (currentComponentType === componentType) {
         const data = components[i];
         return data as Component<T>;
      }
   }

   throw new Error();
}

// Transform component is a special case which can be done faster
export function getConfigTransformComponent(components: EntityComponents): TransformComponent {
   return components[0] as TransformComponent;
}

export function createEntityConfigAttachInfo(attachedHitbox: Hitbox, parentHitbox: Hitbox, isPartOfParent: boolean): EntityConfigAttachInfo {
   return {
      attachedHitbox: attachedHitbox,
      parentHitbox: parentHitbox,
      isPartOfParent: isPartOfParent
   };
}

export function createEntityConfigAttachInfoWithTether(attachedHitbox: Hitbox, parentHitbox: Hitbox, idealDistance: number, springConstant: number, damping: number, affectsOriginHitbox: boolean, isPartOfParent: boolean, angularTether?: HitboxAngularTether): EntityConfigAttachInfoWithTether {
   return {
      attachedHitbox: attachedHitbox,
      parentHitbox: parentHitbox,
      isPartOfParent: isPartOfParent,
      idealDistance: idealDistance,
      springConstant: springConstant,
      damping: damping,
      affectsOriginHitbox: affectsOriginHitbox,
      angularTether: angularTether
   };
}

export function entityConfigAttachInfoIsTethered(attachInfo: EntityConfigAttachInfo | EntityConfigAttachInfoWithTether): attachInfo is EntityConfigAttachInfoWithTether {
   return typeof (attachInfo as EntityConfigAttachInfoWithTether).angularTether !== "undefined";
}