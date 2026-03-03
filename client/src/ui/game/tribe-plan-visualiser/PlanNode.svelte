<script lang="ts">
   import { AIPlanType } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import CLIENT_ITEM_INFO_RECORD from "../../../game/client-item-info";
   import { getPlanX, getPlanY } from "../../../ui-state/tribe-plan-visualiser-state";
   import { type AIPlan } from "../../../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
   import PlanNode from "./PlanNode.svelte";
   import PlanConnector from "./PlanConnector.svelte";

   interface Props {
      readonly offsetX: number;
      readonly offsetY: number;
      readonly plan: AIPlan;
   }

   let props: Props = $props();

   const plan = props.plan;
</script>

<div
   style:left="calc(50% + {getPlanX(plan, props.offsetX)}px"
   style:top="calc(50% + {getPlanY(plan, props.offsetY)}px)"
   class="tribe-plan-node"
   class:complete={plan.isCompletable}
   class:assigned={plan.assignedTribesman !== null}
   class:incompletable={!plan.isCompletable}
>
   {#if plan.type === AIPlanType.root}
      <h3 class="title">Root Plan</h3>
   {:else if plan.type === AIPlanType.craftRecipe}
      {@const productClientItemInfo = CLIENT_ITEM_INFO_RECORD[plan.recipe.product]}
      <h3 class="title">Craft Recipe</h3>
      <p>{productClientItemInfo.name}</p>
      <p>Amount: {plan.productAmount}</p>
   {:else if plan.type === AIPlanType.placeBuilding}
      <h3 class="title">Place Building</h3>
      <p>{CLIENT_ENTITY_INFO_RECORD[plan.entityType].name}</p>
   {:else if plan.type === AIPlanType.upgradeBuilding}
      <h3 class="title">Upgrade Building</h3>
   {:else if plan.type === AIPlanType.doTechStudy}
      <h3 class="title">Study Tech</h3>
      <p>{plan.tech.name}</p>
   {:else if plan.type === AIPlanType.doTechItems}
      <h3 class="title">Do Tech Items</h3>
      <p>{plan.tech.name}</p>
      <p>{CLIENT_ITEM_INFO_RECORD[plan.itemType].name}</p>
   {:else if plan.type === AIPlanType.completeTech}
      <h3 class="title">Complete Tech</h3>
      <p>{plan.tech.name}</p>
   {:else if plan.type === AIPlanType.gatherItem}
      <h3 class="title">Gather Items</h3>
      <p>{CLIENT_ITEM_INFO_RECORD[plan.itemType].name} x{plan.amount}</p>
   {/if}

   {#if plan.assignedTribesman !== null}
      <p>Assigned: #{plan.assignedTribesman}</p>
   {/if}
</div>

{#each plan.childPlans as childPlan}
   <div>
      <PlanNode plan={childPlan} offsetX={props.offsetX} offsetY={props.offsetY} />
      <PlanConnector startPlan={props.plan} endPlan={childPlan} offsetX={props.offsetX} offsetY={props.offsetY} />
   </div>
{/each}