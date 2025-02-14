import { cx } from "#styled-system/css";
import { Input as ChakraInput, InputProps } from "@chakra-ui/react";
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <ChakraInput
        borderRadius="4px"
        color="black"
        bgColor="white"
        borderColor="background-tertiary"
        border="1px solid"
        p="4px 8px"
        className={className}
        {...props}
        ref={ref}
      />
    );
  },
);
