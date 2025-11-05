<script lang="ts">
   import { EntityType } from "../../../../../shared/src/entities";
   import { TamingSkillNode } from "../../../../../shared/src/taming";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import { getTamingSkillLearning, hasTamingSkill, skillLearningIsComplete, TamingComponent } from "../../../game/entity-components/server-components/TamingComponent";
   import { cursorScreenPos } from "../../../game/mouse-input-input";

   interface TamingSkillTooltipProps {
      readonly entityType: EntityType;
      readonly tamingComponent: TamingComponent;
      readonly skillNode: TamingSkillNode;
   }

   const tamingComponent = props.tamingComponent;
   const skillNode = props.skillNode;
   const skill = skillNode.skill;
   
   const x = cursorScreenPos.x;
   const y = cursorScreenPos.y;

   const skillLearning = getTamingSkillLearning(props.tamingComponent, skill.id);
   
   const description = skill.description.replace("[[CREATURE_NAME]]", CLIENT_ENTITY_INFO_RECORD[props.entityType].name.toLowerCase());
   
</script>

<div id="taming-skill-tooltip" style={{top: y + "px", left: x + "px"}}>
   <p className="description">{description}</p>

   {!hasTamingSkill(tamingComponent, skill.id) ? <>
      {skillNode.requiredTamingTier <= tamingComponent.tamingTier ? (
         skill.requirements.map((requirement, i) => {
            let requirementProgress: number;
            const skillLearning = getTamingSkillLearning(tamingComponent, skill.id);
            if (skillLearning !== null) {
               requirementProgress = skillLearning.requirementProgressArray[i];
            } else {
               requirementProgress = 0;
            }
            
            return <p key={i} className="requirement">{requirement.description}: {requirementProgress}/{requirement.amountRequired}{requirement.suffix}</p>
         })
      ) : null}

      {skillLearning !== null && skillLearningIsComplete(skillLearning) ? (
         <p className="complete-text">Click to claim this skill!</p>
      ) : null}
   </> : null}
   
</div>