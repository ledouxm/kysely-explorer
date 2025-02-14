import { forwardRef } from "react";
import { ButtonProps, Button as ChakraButton } from "@chakra-ui/react";
import { IconButton as ChakraIconButton } from "@chakra-ui/react";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return (
      <ChakraButton
        ref={ref}
        p="4px 8px"
        _hover={{
          bgColor: "text-primary",
        }}
        fontSize="16px"
        cursor="pointer"
        color="background-tertiary"
        bgColor="text-secondary"
        borderRadius="4px"
        fontWeight="bold"
        {...props}
      />
    );
  },
);

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return (
      <ChakraIconButton
        ref={ref}
        _hover={{
          bgColor: "text-primary",
        }}
        fontSize="16px"
        cursor="pointer"
        color="background-tertiary"
        bgColor="text-secondary"
        borderRadius="4px"
        fontWeight="bold"
        {...props}
      />
    );
  },
);

export const FileIconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return (
      <IconButton
        transition="none"
        bgColor="background-tertiary"
        _hover={{
          bgColor: "background-secondary",
        }}
        color="text-primary"
        ref={ref}
        {...props}
      />
    );
  },
);
