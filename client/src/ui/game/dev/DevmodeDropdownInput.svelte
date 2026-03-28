<script lang="ts">
   interface Props {
      readonly text: string;
      readonly options: ReadonlyArray<string>;
      readonly defaultOption?: string;
      onChange?(optionIdx: number): void;
   }

   let props: Props = $props();
   
   let selectedOption = $state(props.defaultOption || props.options[0]);

   $effect(() => {
      if (props.onChange !== undefined) {
         const optionIdx = props.options.indexOf(selectedOption);
         props.onChange(optionIdx);
      }
   });
</script>

<div class="devmode-input">
   <span>{props.text}</span>
   <select bind:value={selectedOption}>
      {#each props.options as option}
         <option value={option}>{option}</option>
      {/each}
   </select>
</div>