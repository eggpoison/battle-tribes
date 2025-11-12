<script lang="ts">
   import { type TamingSkillNode, EntityType } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import { skillLearningIsComplete, type TamingSkillLearning } from "../../../game/entity-components/server-components/TamingComponent";
   import { tamingMenuState } from "../../../ui-state/taming-menu-state.svelte";
   import { gameUIState } from "../../../ui-state/game-ui-state.svelte";

   interface Props {
      entityType: EntityType;
      skillNode: TamingSkillNode;
      hasSkill: boolean;
   }

   let props: Props = $props();

   const skillNode = props.skillNode;
   const skill = skillNode.skill;
   
   const getTamingSkillLearning = (): TamingSkillLearning | null => {
      for (const skillLearning of tamingMenuState.skillLearningArray) {
         if (skillLearning.skill.id === skill.id) {
            return skillLearning;
         }
      }
      return null;
   }

   const skillLearning = $derived(getTamingSkillLearning());
   
   const description = skill.description.replace("[[CREATURE_NAME]]", CLIENT_ENTITY_INFO_RECORD[props.entityType].name.toLowerCase());
   
   const getRequirementProgress = (i: number): number => {
      if (skillLearning !== null) {
         return skillLearning.requirementProgressArray[i];
      } else {
         return 0;
      }
   }
</script>

<div id="taming-skill-tooltip" style:top="{gameUIState.cursorY}px" style:left="{gameUIState.cursorX}px">
   <p class="description">{description}</p>

   {#if !props.hasSkill}
      {#if skillNode.requiredTamingTier <= tamingMenuState.tamingTier}
         {#each skill.requirements as requirement, i}
            
            <p class="requirement">{requirement.description}: {getRequirementProgress(i)}/{requirement.amountRequired}{requirement.suffix}</p>
         {/each}
      {/if}

      {#if skillLearning !== null && skillLearningIsComplete(skillLearning)}
         <p class="complete-text">Click to claim this skill!</p>
      {/if}
   {/if}
</div>