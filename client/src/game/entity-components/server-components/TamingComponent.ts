import { TribeType, getTamingSkill, TamingSkill, TamingSkillID, Settings, PacketReader, ItemType, Entity, EntityType, ServerComponentType, UtilVar } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import { getPlayerSelectedItem } from "../../player-action-handling";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { playerTribe } from "../../tribes";
import { EntityComponentData, getEntityRenderObject, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { tamingMenuState } from "../../../ui-state/taming-menu-state";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getRenderThingByTag } from "../../render-parts/render-part-tags";

export interface TamingSkillLearning {
   readonly skill: TamingSkill;
   /** Indexes will be the same as the requirements on the skill */
   readonly requirementProgressArray: Array<number>;
}

export interface TamingComponentData {
   readonly tamingTier: number;
   readonly foodEatenInTier: number;
   readonly name: string;
   readonly acquiredSkills: Array<TamingSkill>;
   readonly skillLearningArray: Array<TamingSkillLearning>;
   readonly isAttacking: boolean;
   readonly isFollowing: boolean;
}

interface IntermediateInfo {
   readonly tamingTierRenderPart: TexturedRenderPart | null;
   readonly attackHalo: RenderPart | null;
   readonly followHalo: RenderPart | null;
}

export interface TamingComponent {
   tamingTier: number;
   foodEatenInTier: number;
   name: string;
   readonly acquiredSkills: Array<TamingSkill>;
   readonly skillLearningArray: Array<TamingSkillLearning>;

   tamingTierRenderPart: TexturedRenderPart | null;

   isAttacking: boolean;
   isFollowing: boolean;
   attackHalo: RenderPart | null;
   followHalo: RenderPart | null;
}

const TAMING_TIER_TEXTURE_SOURCES: Record<number, string> = {
   1: "entities/miscellaneous/taming-tier-1.png",
   2: "entities/miscellaneous/taming-tier-2.png",
   3: "entities/miscellaneous/taming-tier-3.png"
};

// @HACK!! could potentially collide with others. and is just generally shit. ALso might mess with z-indexes!!! if its large enough
const TAMING_TIER_RENDER_PART_Z_INDEX = 19;
const HALO_RENDER_PART_Z_INDEX = 20;

export const TamingComponentArray = new ServerComponentArray<TamingComponent, TamingComponentData, IntermediateInfo>(ServerComponentType.taming, true, createComponent, getMaxRenderParts, decodeData);
TamingComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TamingComponentArray.updateFromData = updateFromData;
TamingComponentArray.onTick = onTick;
TamingComponentArray.updateSelectedEntityState = updateSelectedEntityState;

function decodeData(reader: PacketReader): TamingComponentData {
   const tamingTier = reader.readNumber();
   const berriesEatenInTier = reader.readNumber();
   const name = reader.readString();

   const numAcquiredSkills = reader.readNumber();
   const acquiredSkills: Array<TamingSkill> = [];
   for (let i = 0; i < numAcquiredSkills; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);
      acquiredSkills.push(skill);
   }

   const numSkillLearnings = reader.readNumber();
   const skillLearningArray: Array<TamingSkillLearning> = [];
   for (let i = 0; i < numSkillLearnings; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);

      const requirementProgressArray: Array<number> = [];
      for (let i = 0; i < skill.requirements.length; i++) {
         const requirementProgress = reader.readNumber();
         requirementProgressArray.push(requirementProgress);
      }
      
      const skillLearning: TamingSkillLearning = {
         skill: skill,
         requirementProgressArray: requirementProgressArray
      };
      skillLearningArray.push(skillLearning);
   }
   
   const isAttacking = reader.readBool();
   const isFollowing = reader.readBool();
   
   return {
      tamingTier: tamingTier,
      foodEatenInTier: berriesEatenInTier,
      name: name,
      acquiredSkills: acquiredSkills,
      skillLearningArray: skillLearningArray,
      isAttacking: isAttacking,
      isFollowing: isFollowing
   };
}

const createFollowHalo = (headRenderPart: RenderPart): RenderPart => {
   const followHalo = new TexturedRenderPart(
      headRenderPart,
      HALO_RENDER_PART_Z_INDEX,
      0,
      0, 0,
      getTextureArrayIndex("entities/miscellaneous/follow-halo.png")
   );
   followHalo.inheritParentRotation = false;
   return followHalo;
}

const createAttackHalo = (headRenderPart: RenderPart): RenderPart => {
   const attackHalo = new TexturedRenderPart(
      headRenderPart,
      HALO_RENDER_PART_Z_INDEX,
      0,
      0, 0,
      getTextureArrayIndex("entities/miscellaneous/attack-halo.png")
   );
   attackHalo.inheritParentRotation = false;
   return attackHalo;
}

const getTamingTierRenderPartOpacity = (): number => {
   const heldItem = getPlayerSelectedItem();
   if (heldItem !== null && (heldItem.type === ItemType.animalStaff || heldItem.type === ItemType.tamingAlmanac)) {
      return 0.55;
   }
   return 0;
}

const createTamingTierRenderPart = (tamingTier: number, parentHitbox: Hitbox): TexturedRenderPart => {
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      TAMING_TIER_RENDER_PART_Z_INDEX,
      0,
      0, 0,
      getTextureArrayIndex(TAMING_TIER_TEXTURE_SOURCES[tamingTier])
   );
   renderPart.inheritParentRotation = false;
   renderPart.opacity = getTamingTierRenderPartOpacity();
   return renderPart;
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tamingComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.taming);
   const tamingTier = tamingComponentData.tamingTier;

   // @HACK @TEMPORARY: the entity intermediate info's render object is the wrong one to use for glurbs, sooo... we don't set it and let the updateFromData figure it out.
   const tamingTierRenderPart = null;
   if (1+1===3) {
      const tamingTierRenderPart = tamingTier > 0 ? createTamingTierRenderPart(tamingTier, hitbox) : null;
      // @Speed: 2nd comparison
      if (tamingTierRenderPart !== null) {
         renderObject.attachRenderPart(tamingTierRenderPart);
      }
   }
   
   // Attack halo
   let attackHalo: RenderPart | null;
   // if (tamingComponentData.isAttacking) {
   //    // @Copynpaste
   //    const headRenderPart = renderObject.getRenderThing("tamingComponent:head");
   //    attackHalo = createAttackHalo(headRenderPart);
   //    renderObject.attachRenderPart(attackHalo);
   // } else {
   //    attackHalo = null;
   // }
   attackHalo = null;
   
   // Follow halo
   let followHalo: RenderPart | null;
   // if (tamingComponentData.isFollowing) {
   //    const headRenderPart = renderObject.getRenderThing("tamingComponent:head");
   //    followHalo = createFollowHalo(headRenderPart);
   //    renderObject.attachRenderPart(followHalo);
   // } else {
   //    followHalo = null;
   // }
   followHalo = null;
   
   return {
      tamingTierRenderPart: tamingTierRenderPart,
      attackHalo: attackHalo,
      followHalo: followHalo
   }
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): TamingComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tamingComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.taming);
   return {
      tamingTier: tamingComponentData.tamingTier,
      foodEatenInTier: tamingComponentData.foodEatenInTier,
      name: tamingComponentData.name,
      acquiredSkills: tamingComponentData.acquiredSkills,
      skillLearningArray: tamingComponentData.skillLearningArray,
      tamingTierRenderPart: intermediateInfo.tamingTierRenderPart,
      isAttacking: tamingComponentData.isAttacking,
      isFollowing: tamingComponentData.isFollowing,
      attackHalo: intermediateInfo.attackHalo,
      followHalo: intermediateInfo.followHalo
   };
}

function getMaxRenderParts(): number {
   // @Hack: shoudl be lower
   return 5;
}

/**
crypto miner video
- the actual game should eb something tangientally reltated to crypto mining, e.g. you are a miner of the corporation Crypt Miners Inc., working in the crypt (the cover)
- through tthe video make very many hints that it is a crypto miner
- REALLY encourage people to play the game throughout the video
   - say "leave it running throughout the night"
   - mention the high battery usage but say there are complex algorithms at work
   - this game uses an advanced monetisation model (never mention what it is and have it be free to play with no ads or in game purchases)
   - in every irl clip with the game have my computer going with fan at 100% completely overpowering the narration and other audio
   - mention i've been looking into diversifying my income streams recently
   - mention doge at least 3 times
      - also mention web3 VERY frequently (this game uses BLOCKCHAIN technology to secure your account and other features)
   - say that you should play this game with the best GPU possible. "EXTREMELY GPU INTENSIVE GAME". and have the graphics be REAAALY simple and no intensive logic
      - 8 bit sound effects
      - similar to legend of zelda 1 (slow load times)
      as a loading thing have "mining crypto.." and it changes to "calculating AI vectors"
         - "Mining crypto for Eggpoison ({{wallet address}})" for the 1st frame and it immediately changes and from then on is normal stuff
         have my wallet address be a central plot point but not mentioned as a wallet address
            - "We must find the first part of the Key" -> first 10 chars
            - maybe you mine the ore and then bring it back to a house where its address is my crypto wallet
            have the gameplay mimic the crypto mining process (e.g. mine until you finish the job)
   - maybe a followup video on 2nd chanpnel about the allegations that it is a crypto miner
      - in the comments, vehemently argue with every single person, regardless of whether they are in on it or not. Also constnatly shill bitcoin indiscretely; make every response very clearly written by an old model of chatgpt. It should always end with "Let me know if you ahve any other questions!" and begin with "Thanks for the really insightful comment!"
      - never deny it, only plug blockchain technology and doge
         - First, let me weave you a story. About a new up and coming Web3 blockchain product which will revolutionise the industry (never mention which industry)
         - Let me address the unfounded and frankly antagonistic allegations that my most recent game is mining crypto in the background. But before we unpack these fantasies, have you heard of BitCoin?
         - start the video on a browser page looking at my crypto wallet
            - make another program which shows all active players of the game as little rats in cells in a big block with all of their hostnames, and coins being funneled into a big pig money jar
         - be eating chips the entire time, as i'm speaking too, and drinking water really obnoxiously
         * @param tamingComponent 
 * @param skillID 
 * @returns 
 */
export function getTamingSkillLearning(tamingComponent: TamingComponent, skillID: TamingSkillID): TamingSkillLearning | null {
   for (const skillLearning of tamingComponent.skillLearningArray) {
      if (skillLearning.skill.id === skillID) {
         return skillLearning;
      }
   }
   return null;
}

export function skillLearningIsComplete(skillLearning: TamingSkillLearning): boolean {
   for (let i = 0; i < skillLearning.skill.requirements.length; i++) {
      const requirement = skillLearning.skill.requirements[0];
      const requirementProgress = skillLearning.requirementProgressArray[0];
      if (requirementProgress < requirement.amountRequired) {
         return false;
      }
   }

   return true;
}

function onTick(entity: Entity): void {
   // @Speed
   const tamingComponent = TamingComponentArray.getComponent(entity);
   if (tamingComponent.tamingTierRenderPart !== null) {
      tamingComponent.tamingTierRenderPart.opacity = getTamingTierRenderPartOpacity();
   }

   // @Speed
   // @Bug: Will look jittery for low TPS values.
   if (tamingComponent.followHalo !== null) {
      tamingComponent.followHalo.angle += 0.65 * UtilVar.PI * Settings.DT_S;
   }

   // @Copynpaste
   if (tamingComponent.attackHalo !== null) {
      tamingComponent.attackHalo.angle += 0.65 * UtilVar.PI * Settings.DT_S;
   }
}

// @Hack
const getHeadHitbox = (entity: Entity): Hitbox => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   return transformComponent.hitboxes[0];
}

// @Hack
const getHeadRenderObject = (entity: Entity): EntityRenderObject => {
   return getEntityRenderObject(entity);
}

function updateFromData(data: TamingComponentData, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);

   const tamingTier = data.tamingTier;
   if (tamingTier !== tamingComponent.tamingTier) {
      if (tamingComponent.tamingTierRenderPart === null) {
          const hitbox = getHeadHitbox(entity);
         
         tamingComponent.tamingTierRenderPart = createTamingTierRenderPart(tamingTier, hitbox);
         const renderObject = getHeadRenderObject(entity);
         renderObject.attachRenderPart(tamingComponent.tamingTierRenderPart);
      } else {
         tamingComponent.tamingTierRenderPart.textureArrayIndex = getTextureArrayIndex(TAMING_TIER_TEXTURE_SOURCES[tamingTier]);
      }
   }
   tamingComponent.tamingTier = tamingTier;
   
   tamingComponent.foodEatenInTier = data.foodEatenInTier;
   tamingComponent.name = data.name;

   for (let i = 0; i < data.acquiredSkills.length; i++) {
      if (i >= tamingComponent.acquiredSkills.length) {
         const skillData = data.acquiredSkills[i];
         tamingComponent.acquiredSkills.push(skillData);
      }
   }

   // @SPEED @GARBAGE
   tamingComponent.skillLearningArray.length = 0;
   for (const skillLearning of data.skillLearningArray) {
      tamingComponent.skillLearningArray.push(skillLearning);
   }

   tamingComponent.isAttacking = data.isAttacking;
   tamingComponent.isFollowing = data.isFollowing;
   
   // @Copynpaste
   if (tamingComponent.isAttacking) {
      if (tamingComponent.attackHalo === null) {
         const renderObject = getEntityRenderObject(entity);
         const headRenderPart = getRenderThingByTag(renderObject, "tamingComponent:head");
         tamingComponent.attackHalo = createAttackHalo(headRenderPart);
         renderObject.attachRenderPart(tamingComponent.attackHalo);
      }
   } else if (tamingComponent.attackHalo !== null) {
      const renderObject = getEntityRenderObject(entity);
      renderObject.removeRenderPart(tamingComponent.attackHalo);
      tamingComponent.attackHalo = null;
   }

   if (tamingComponent.isFollowing) {
      if (tamingComponent.followHalo === null) {
         const renderObject = getHeadRenderObject(entity);
         const headRenderPart = getRenderThingByTag(renderObject, "tamingComponent:head");
         tamingComponent.followHalo = createFollowHalo(headRenderPart);
         renderObject.attachRenderPart(tamingComponent.followHalo);
      }
   } else if (tamingComponent.followHalo !== null) {
      const renderObject = getHeadRenderObject(entity);
      renderObject.removeRenderPart(tamingComponent.followHalo);
      tamingComponent.followHalo = null;
   }
}

function updateSelectedEntityState(entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   tamingMenuState.tamingTier = tamingComponent.tamingTier;
   tamingMenuState.name = tamingComponent.name;
   tamingMenuState.foodEatenInTier = tamingComponent.foodEatenInTier;
   tamingMenuState.acquiredSkills = tamingComponent.acquiredSkills.map(skill => skill.id);
}

export function hasTamingSkill(tamingComponent: TamingComponent, skillID: TamingSkillID): boolean {
   for (const skill of tamingComponent.acquiredSkills) {
      if (skill.id === skillID) {
         return true;
      }
   }
   return false;
}

export function entityIsTameableByPlayer(entity: Entity): boolean {
   if (getEntityType(entity) === EntityType.yeti && playerTribe.tribeType !== TribeType.frostlings) {
      return false;
   }

   return TamingComponentArray.hasComponent(entity);
}