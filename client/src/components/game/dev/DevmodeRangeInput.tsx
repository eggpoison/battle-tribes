import { forwardRef, useRef, useState } from "react";

interface DevmodeRangeInputProps {
   readonly text: string;
   readonly defaultValue: number;
   onChange(newValue: number): void;
}

const DevmodeRangeInput = forwardRef<HTMLInputElement | null, DevmodeRangeInputProps>((props: DevmodeRangeInputProps) => {
   const ref = useRef<HTMLInputElement | null>(null);
   const [value, setValue] = useState(props.defaultValue);
   
   const onChange = (): void => {
      if (ref.current === null) {
         return;
      }

      const value = Number(ref.current.value);
      setValue(value);
      props.onChange(value);
   }
   
   return <label className="range-input-label">
      <span>{props.text} <span className="weighted">{value}</span></span>
      <input ref={ref} type="range" name="zoom-input" defaultValue={value} min={0} max={250} step={25} onChange={onChange} />
   </label>;
});

export default DevmodeRangeInput;