const Menu = (props: React.HTMLAttributes<HTMLDivElement>) => {
   return <div {...props} onContextMenu={e => e.preventDefault()}>
      {props.children}
   </div>;
}

export default Menu;