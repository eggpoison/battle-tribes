interface InventoryWrapperProps {
   readonly id?: string;
   readonly children: JSX.Element | Array<JSX.Element>;
}

const InventoryWrapper = ({ id, children }: InventoryWrapperProps) => {
   return (
      <div id={id} className="inventory-wrapper">
         {children}
      </div>
   )
}

export default InventoryWrapper;