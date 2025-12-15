import { ReactNode } from "react";
import { Link, LinkProps } from "react-router-dom";
import { ButtonProps } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { GradientButton } from "../ui/gradient-button";

interface AiInsightsButton extends LinkProps {
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  loading?: boolean
}

function AiInsightsButton(props: AiInsightsButton) {
  return (
    <Link {...props} className={cn("flex items-center", props.className)}>
      {/* <Button
        variant={props.variant}
        className={cn(
          "flex items-center gap-2 text-white transition-all duration-500 bg-[length:200%_200%] bg-gradient-to-r from-primary to-secondary bg-[position:0%_0%] hover:bg-[position:100%_100%]"
        )}
      >
        {props.children || "AI Insights"}
      </Button> */}
      <GradientButton variant="variant" loading={props.loading} >
        {props.children || "AI Insights"}
      </GradientButton>
    </Link>
  );
}

export default AiInsightsButton;
