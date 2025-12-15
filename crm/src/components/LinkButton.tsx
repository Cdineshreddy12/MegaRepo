import { ReactNode } from "react";
import { Link, LinkProps } from "react-router-dom";
import { Button, ButtonProps } from "@/components/ui/button";

interface LinkButton extends LinkProps {
  children: ReactNode;
  variant?: ButtonProps["variant"];
}
function LinkButton(props: LinkButton) {
  return (
    <Link {...props}>
      <Button variant={props.variant}>{props.children}</Button>
    </Link>
  );
}

export default LinkButton;
