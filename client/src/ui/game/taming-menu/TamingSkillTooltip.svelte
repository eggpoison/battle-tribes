<script lang="ts">
   import { type TamingSkillNode, EntityType } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import { getTamingSkillLearning, hasTamingSkill, skillLearningIsComplete, type TamingComponent } from "../../../game/entity-components/server-components/TamingComponent";
   import { cursorScreenPos } from "../../../game/mouse-input";

   interface Props {
      readonly entityType: EntityType;
      readonly tamingComponent: TamingComponent;
      readonly skillNode: TamingSkillNode;
   }

   let props: Props = $props();

   const tamingComponent = props.tamingComponent;
   const skillNode = props.skillNode;
   const skill = skillNode.skill;
   
   const x = cursorScreenPos.x;
   const y = cursorScreenPos.y;

   const skillLearning = getTamingSkillLearning(props.tamingComponent, skill.id);
   
   const description = skill.description.replace("[[CREATURE_NAME]]", CLIENT_ENTITY_INFO_RECORD[props.entityType].name.toLowerCase());
   
   const getRequirementProgress = (i: number): number => {
      const skillLearning = getTamingSkillLearning(tamingComponent, skill.id);
      if (skillLearning !== null) {
         return skillLearning.requirementProgressArray[i];
      } else {
         return 0;
      }
   }
</script>

<div id="taming-skill-tooltip" style:top="{y}px" style:left="{x}px">
   <p class="description">{description}</p>

   {#if !hasTamingSkill(tamingComponent, skill.id)}
      {#if skillNode.requiredTamingTier <= tamingComponent.tamingTier}
         {#each skill.requirements as requirement, i}
            
            <p class="requirement">{requirement.description}: {getRequirementProgress(i)}/{requirement.amountRequired}{requirement.suffix}</p>
         {/each}
      {/if}

      {#if skillLearning !== null && skillLearningIsComplete(skillLearning)}
         <p class="complete-text">Click to claim this skill!</p>
      {/if}
   {/if}
</div>