<script lang="ts">
   interface Props {
      value: number;
      readonly text: string;
      onChange?(newValue: number): void;
   }

   let { value = $bindable(), ...props}: Props = $props();
   
   $effect((): void => {
      if (props.onChange !== undefined) {
         props.onChange(value);
      }
   });
</script>


<label class="devmode-input range-input-label">
   <span>{props.text} <span class="weighted">{value}</span></span>
   <input type="range" name="zoom-input" bind:value={value} min={0} defaultValue={50} max={250} step={25} />
</label>