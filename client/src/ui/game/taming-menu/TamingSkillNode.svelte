<script lang="ts">
   import { assert, type Entity, TamingSkillID, type TamingSkillNode } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import { keyIsPressed } from "../../../game/keyboard-input";
   import { sendForceAcquireTamingSkillPacket, sendAcquireTamingSkillPacket } from "../../../game/networking/packet-sending/packet-sending";
   import { playHeadSound } from "../../../game/sound";
   import { isDev } from "../../../game/utils";
   import { getEntityType } from "../../../game/world";
   import { SKILL_TRANSFORM_SCALE_FACTOR, tamingMenuState } from "../../../ui-state/taming-menu-state";
   import { tamingSkillTooltipState } from "../../../ui-state/taming-skill-tooltip-state";

   interface Props {
      skillNode: TamingSkillNode;
      hasSkill: boolean;
      entity: Entity;
   }

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

   let props: Props = $props();

   const skillIconImages = import.meta.glob("/src/images/menus/taming-almanac/**/*", { eager: true, query: "?url", import: "default" });

   const skillNode = props.skillNode;
   const skill = skillNode.skill;

   const onmousedown = (): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceAcquireTamingSkillPacket(props.entity, skill.id);
      } else {
         sendAcquireTamingSkillPacket(props.entity, skill.id);
      }

      playHeadSound("taming-skill-acquire.mp3", 0.4, 1);
   }

   const onmouseover = (e: MouseEvent): void => {
      tamingSkillTooltipState.setSkillNode(skillNode);
      tamingSkillTooltipState.setX(e.clientX);
      tamingSkillTooltipState.setY(e.clientY);
   }

   const onmousemove = (e: MouseEvent): void => {
      tamingSkillTooltipState.setX(e.clientX);
      tamingSkillTooltipState.setY(e.clientY);
   }

   const onmouseout = (): void => {
      tamingSkillTooltipState.setSkillNode(null);
   }
   
   const ending = SKILL_ICON_NAMES[skill.id];
   const entityInternalName = CLIENT_ENTITY_INFO_RECORD[getEntityType(props.entity)].internalName;
   const img = skillIconImages["/src/images/menus/taming-almanac/" + entityInternalName + "-skills/" + ending] as string;
   assert(img !== undefined);
</script>

<div
   style:top="{skillNode.y * SKILL_TRANSFORM_SCALE_FACTOR}rem"
   style:left="calc(50% + {skillNode.x * SKILL_TRANSFORM_SCALE_FACTOR}rem)"
   class="skill"
   class:inaccessible={skillNode.requiredTamingTier > tamingMenuState.tamingTier}
   class:acquired={props.hasSkill}
>
   <div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_mouse_events_have_key_events -->
      <div class="skill-icon-wrapper" {onmousedown} {onmouseover} {onmousemove} {onmouseout}>
         <div class="skill-bg"></div>
         <img class="skill-icon" src={img} alt="" />
      </div>
   </div> 
   <p>{skill.name}</p>
</div>