<script lang="ts">
   import { TamingSkillID, type TamingSkillNode } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import { hasTamingSkill, TamingComponentArray } from "../../../game/entity-components/server-components/TamingComponent";
   import { keyIsPressed } from "../../../game/keyboard-input";
   import { sendForceAcquireTamingSkillPacket, sendAcquireTamingSkillPacket } from "../../../game/networking/packet-sending";
   import { playHeadSound } from "../../../game/sound";
   import { isDev } from "../../../game/utils";
   import { getEntityType } from "../../../game/world";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";
   import TamingSkillTooltip from "./TamingSkillTooltip.svelte";
   import { SKILL_TRANSFORM_SCALE_FACTOR } from "../../../ui-state/taming-menu-state.svelte";

   interface Props {
      skillNode: TamingSkillNode;
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

   // @Hack: "!"
   const entity = entityInteractionState.selectedEntity!;
   const tamingComponent = TamingComponentArray.getComponent(entity);
   
   const skillNode = props.skillNode;
   const skill = skillNode.skill;

   let isHovered = $state(false);

   const onmousedown = (): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceAcquireTamingSkillPacket(entity, skill.id);
      } else {
         sendAcquireTamingSkillPacket(entity, skill.id);
      }

      playHeadSound("taming-skill-acquire.mp3", 0.4, 1);
   }

   const onmouseover = (): void => {
      isHovered = true;
   }

   const onmouseout = (): void => {
      isHovered = false;
   }
   
   const ending = SKILL_ICON_NAMES[skill.id];
   const entityInternalName = CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)].internalName;
   const iconSrc = require("../../../images/menus/taming-almanac/" + entityInternalName + "-skills/" + ending);
</script>

<div
   style:top="{skillNode.y * SKILL_TRANSFORM_SCALE_FACTOR}rem"
   style:left="calc(50% + {skillNode.x * SKILL_TRANSFORM_SCALE_FACTOR}rem)"
   class="skill"
   class:inaccessible={skillNode.requiredTamingTier > tamingComponent.tamingTier}
   class:acquired={hasTamingSkill(tamingComponent, skill.id)}
>
   <div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_mouse_events_have_key_events -->
      <div class="skill-icon-wrapper" {onmousedown} {onmouseover} {onmouseout}>
         <div class="skill-bg"></div>
         <img class="skill-icon" src={iconSrc} alt="" />
      </div>
   </div> 
   <p>{skill.name}</p>
</div>

{#if isHovered}
   <TamingSkillTooltip entityType={getEntityType(entity)} {tamingComponent} {skillNode} />
{/if}