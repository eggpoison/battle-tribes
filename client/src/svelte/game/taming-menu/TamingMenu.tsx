import { useEffect, useReducer, useState } from "react";
import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
import { entityExists, getEntityType } from "../../../game/world";
import { Entity } from "../../../../../shared/src/entities";
import { TamingSkill, TamingSkillID, TamingSkillNode, TamingTier } from "battletribes-shared/taming";
import { hasTamingSkill, TamingComponent, TamingComponentArray } from "../../../game/entity-components/server-components/TamingComponent";
import Menu from "../menus/Menu";
import { keyIsPressed } from "../../../game/keyboard-input";
import { sendAcquireTamingSkillPacket, sendCompleteTamingTierPacket, sendForceAcquireTamingSkillPacket, sendForceCompleteTamingTierPacket } from "../../../game/networking/packet-sending";
import { isDev } from "../../../game/utils";
import TamingSkillTooltip from "./TamingSkillTooltip";
import { getEntityTamingSpec } from "../../../game/taming-specs";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
import { assert } from "../../../../../shared/src/utils";
import { playHeadSound } from "../../../game/sound";
import { addMenuCloseFunction } from "../../../game/menus";
import { TamingRenamePrompt_close, TamingRenamePrompt_open } from "./TamingRenamePrompt";

const enum Vars {
   SKILL_TRANSFORM_SCALE_FACTOR = 0.5
}

interface TierSeparatorProps {
   readonly tamingTier: TamingTier;
}

interface SkillConnectorProps {
   readonly tamingComponent: TamingComponent;
   readonly fromSkillNode: TamingSkillNode;
   readonly toSkillNode: TamingSkillNode;
}

export const TAMING_TIER_Y_POSITIONS: Record<TamingTier, number> = {
   0: 0,
   1: 0,
   2: 20,
   3: 40
};

export let TamingMenu_setVisibility: (isVisible: boolean) => void = () => {};
export let TamingMenu_setEntity: (entity: Entity) => void = () => {};
export let TamingMenu_forceUpdate: () => void = () => {};

const SKILL_ICON_NAMES: Record<TamingSkillID, string> = {
   [TamingSkillID.follow]: "follow-skill.png",
   [TamingSkillID.riding]: "riding-skill.png",
   [TamingSkillID.move]: "move-skill.png",
   [TamingSkillID.carry]: "carry-skill.png",
   [TamingSkillID.attack]: "attack-skill.png",
   [TamingSkillID.shatteredWill]: "shattered-will-skill.png",
   [TamingSkillID.dulledPainReceptors]: "dulled-pain-receptors.png",
   [TamingSkillID.imprint]: "imprint-skill.png",
};

const UNUSED_NAMETAG_IMG = require("../../../images/menus/taming-almanac/nametag-unused.png");
const USED_NAMETAG_IMG = require("../../../images/menus/taming-almanac/nametag-used.png");

const TAMING_TIER_ICONS: Record<number, any> = {
   0: require("../../../images/entities/miscellaneous/taming-tier-0.png"),
   1: require("../../../images/entities/miscellaneous/taming-tier-1.png"),
   2: require("../../../images/entities/miscellaneous/taming-tier-2.png"),
   3: require("../../../images/entities/miscellaneous/taming-tier-3.png")
};

const TierSeparator = (props: TierSeparatorProps) => {
   const y = TAMING_TIER_Y_POSITIONS[props.tamingTier];

   return <div className="tier-separator-container" style={{top: y * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem"}}>
      <img className="tier-icon" src={TAMING_TIER_ICONS[props.tamingTier]} />
      <div className="tier-separator"></div>
   </div>;
}

const SkillConnector = (props: SkillConnectorProps) => {
   // Position it at the start skill
   const x = props.fromSkillNode.x * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem";
   const y = props.fromSkillNode.y * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem";

   const offsetX = props.toSkillNode.x - props.fromSkillNode.x;
   const offsetY = props.toSkillNode.y - props.fromSkillNode.y;
   const offsetDirection = Math.atan2(offsetY, offsetX);
   const offsetMagnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem";
   
   let className = "skill-connector";
   if (hasTamingSkill(props.tamingComponent, props.toSkillNode.skill.id)) {
      className += " confirmed";
   }
   
   return <div className={className} style={{"--x": x, "--y": y, "--direction-rad": offsetDirection + "rad", "--magnitude": offsetMagnitude} as React.CSSProperties}></div>;
}

const TamingMenu = () => {
   const [entity, setEntity] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   const [_, forceUpdate] = useReducer(x => x + 1, 0);
   const [hoveredSkill, setHoveredSkill] = useState<TamingSkillNode | null>(null);
   
   useEffect(() => {
      TamingMenu_setEntity = setEntity;
      TamingMenu_setVisibility = setIsVisible;

      // @Hack
      TamingMenu_forceUpdate = forceUpdate;
   }, []);

   useEffect(() => {
      if (!isVisible) {
         setHoveredSkill(null);
      }
   }, [isVisible]);

   if (!isVisible || !entityExists(entity)) {
      return null;
   }

   const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)];

   const tamingComponent = TamingComponentArray.getComponent(entity);
   const tamingSpec = getEntityTamingSpec(entity);
   const nextTamingTierFoodCost: number | undefined = tamingSpec.tierFoodRequirements[(tamingComponent.tamingTier + 1) as TamingTier];

   const foodProgress = typeof nextTamingTierFoodCost !== "undefined" ? Math.min(tamingComponent.foodEatenInTier / nextTamingTierFoodCost, 1) : 1;

   const onCompleteButtonClick = (): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceCompleteTamingTierPacket(entity);
      } else {
         sendCompleteTamingTierPacket(entity);
      }

      playHeadSound("taming-tier-complete.mp3", 1, 1);
   }

   const onSkillClick = (skill: TamingSkill): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceAcquireTamingSkillPacket(entity, skill.id);
      } else {
         sendAcquireTamingSkillPacket(entity, skill.id);
      }

      playHeadSound("taming-skill-acquire.mp3", 0.4, 1);
   }

   const onSkillMouseOver = (skill: TamingSkillNode): void => {
      setHoveredSkill(skill);
   }

   const onSkillMouseOut = (): void => {
      setHoveredSkill(null);
   }

   const openRenamePrompt = (): void => {
      TamingRenamePrompt_open(entity);
      
      addMenuCloseFunction(TamingRenamePrompt_close);
   }

   let progressBarClassName: string;
   switch (tamingComponent.tamingTier) {
      case 0: {
         progressBarClassName = "green";
         break;
      }
      case 1: {
         progressBarClassName = "blue";
         break;
      }
      case 2:
      case 3: {
         progressBarClassName = "purple";
         break;
      }
      default: throw new Error();
   }

   let minX = 0;
   let maxX = 0;
   let maxY = 0;
   for (const skillNode of tamingSpec.skillNodes) {
      if (skillNode.x < minX) {
         minX = skillNode.x;
      } else if (skillNode.x > maxX) {
         maxX = skillNode.x;
      }
      if (skillNode.y > maxY) {
         maxY = skillNode.y;
      }
   }
   let skillMapWidth = maxX - minX;
   let skillMapHeight = maxY;
   // Pad it
   skillMapWidth += 18;
   skillMapHeight += 8;
   
   return <>
      <Menu id="taming-menu" className="menu">
         <h1>
            {clientEntityInfo.name}
            {tamingComponent.name !== "" ? <> ({tamingComponent.name})</> : null}
            {tamingComponent.tamingTier > 0 ? (
               <img onClick={openRenamePrompt} className="rename-icon" src={tamingComponent.name !== "" ? USED_NAMETAG_IMG : UNUSED_NAMETAG_IMG} />
            ) : null}
         </h1>

         <p className="taming-tier">
            <span>Taming Tier:</span>
            <img src={TAMING_TIER_ICONS[tamingComponent.tamingTier]} />
         </p>

         <div className="progress-area">
            <div className="row">
               <div className="berry-progress-bar">
                  <div className="berry-progress-bar-bg"></div>
                  <div className={"berry-progress-bar-fill " + progressBarClassName} style={{"--width-percentage": foodProgress * 100 + "%"} as React.CSSProperties}></div>
                  <div className="progress-counter">
                     {typeof nextTamingTierFoodCost !== "undefined" ? <>
                        <span>{tamingComponent.foodEatenInTier}/{nextTamingTierFoodCost} {CLIENT_ITEM_INFO_RECORD[tamingSpec.foodItemType].namePlural}</span>
                        <img src={getItemTypeImage(tamingSpec.foodItemType)} />
                     </> : <>
                        <div className="height-padder">
                           <span>Max!</span>
                        </div>
                     </>}
                  </div>
               </div>
               {typeof nextTamingTierFoodCost !== "undefined" ? (
                  <button className={tamingComponent.foodEatenInTier >= nextTamingTierFoodCost ? "clickable" : undefined} onMouseDown={onCompleteButtonClick}>Complete</button>
               ) : null}
            </div>
         </div>

         <div className="skill-map-container" style={{minWidth: skillMapWidth * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem", height: skillMapHeight * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem"}}>
            {tamingSpec.skillNodes.map((skillNode, i) => {
               const skill = skillNode.skill;
               
               let className = "skill";
               if (skillNode.requiredTamingTier > tamingComponent.tamingTier) {
                  className += " inaccessible";
               }
               if (hasTamingSkill(tamingComponent, skill.id)) {
                  className += " acquired";
               }

               const ending = SKILL_ICON_NAMES[skill.id];
               const entityInternalName = CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)].internalName;
               const iconSrc = require("../../../images/menus/taming-almanac/" + entityInternalName + "-skills/" + ending);

               return <div key={i} className={className} style={{top: skillNode.y * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem", left: `calc(50% + ${skillNode.x * Vars.SKILL_TRANSFORM_SCALE_FACTOR}rem)`}}>
                  <div>
                     <div className="skill-icon-wrapper" onMouseDown={() => onSkillClick(skill)} onMouseOver={() => onSkillMouseOver(skillNode)} onMouseOut={() => onSkillMouseOut()}>
                        <div className="skill-bg" />
                        <img className="skill-icon" src={iconSrc} />
                     </div>
                  </div> 
                  <p>{skill.name}</p>
               </div>;
            })}
            {tamingSpec.skillNodes.map((skillNode, i) => {
               if (skillNode.parent !== null && tamingComponent.tamingTier >= skillNode.requiredTamingTier) {
                  let parentSkillNode: TamingSkillNode | undefined;
                  for (const currentSkillNode of tamingSpec.skillNodes) {
                     if (currentSkillNode.skill.id === skillNode.parent) {
                        parentSkillNode = currentSkillNode;
                        break;
                     }
                  }
                  assert(typeof parentSkillNode !== "undefined");
                  
                  return <SkillConnector key={i} tamingComponent={tamingComponent} fromSkillNode={parentSkillNode} toSkillNode={skillNode} />
               } else {
                  return null;
               }
            })}

            {tamingComponent.tamingTier < 1 ? (
               <TierSeparator tamingTier={1} />
            ) : null}
            {tamingComponent.tamingTier < 2 && tamingSpec.maxTamingTier >= 2 ? (
               <TierSeparator tamingTier={2} />
            ) : null}
            {tamingComponent.tamingTier < 3 && tamingSpec.maxTamingTier >= 3 ? (
               <TierSeparator tamingTier={3} />
            ) : null}
         </div>
      </Menu>

      {hoveredSkill !== null ? (
         <TamingSkillTooltip entityType={getEntityType(entity)} tamingComponent={tamingComponent} skillNode={hoveredSkill} />
      ) : null}
   </>;
}

export default TamingMenu;