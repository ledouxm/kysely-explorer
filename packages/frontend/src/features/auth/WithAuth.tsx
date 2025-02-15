import { PropsWithChildren, ReactNode, useState } from "react";
import { authClient } from "../../authClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
import { Center, Flex, Stack, styled } from "#styled-system/jsx";
import { Input } from "../../components/Input";
import { Card, CardBody, CardRoot, CardTitle } from "@chakra-ui/react";
import { Button } from "../../components/Button";
import { api } from "../../api";

export const WithAuth = ({ children }: { children: ReactNode }) => {
  const session = authClient.useSession();
  console.log(session);

  if (session.isPending) {
    return <div>Loading...</div>;
  }

  if (session.error) {
    return <div>Error: {session.error.message}</div>;
  }

  if (!session.data) {
    return (
      <Center>
        <FirstConnectionChecker />
      </Center>
    );
  }

  return <>{children}</>;
};

const FirstConnectionChecker = () => {
  const isFirstConnectionQuery = useQuery({
    queryKey: ["isFirstConnection"],
    gcTime: 0,
    queryFn: async () => {
      const resp = await api["is-first-connection"].$get();
      return (await resp.text()) === "true";
    },
  });

  if (isFirstConnectionQuery.isLoading) {
    return <Center>Loading...</Center>;
  }

  if (isFirstConnectionQuery.error) {
    return <Center>Error: {isFirstConnectionQuery.error.message}</Center>;
  }

  return <LoginOrSignupForm isFirstConnection={isFirstConnectionQuery.data!} />;
};

type LoginOrSignupFormProps = {
  email: string;
  password: string;
  token?: string;
};
const LoginOrSignupForm = ({
  isFirstConnection,
}: {
  isFirstConnection: boolean;
}) => {
  const form = useForm<LoginOrSignupFormProps>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: async (values: LoginOrSignupFormProps) => {
      if (isFirstConnection) {
        return authClient.signUp.email({
          email: values.email,
          password: values.password,
          name: values.email,
          fetchOptions: {
            headers: {
              "X-Root-Token": values.token,
            } as any,
          },
        });
      } else {
        return authClient.signIn.email({
          email: values.email,
          password: values.password,
        });
      }
    },
  });

  console.log(onSubmitMutation);

  return (
    <styled.form
      onSubmit={form.handleSubmit((data) => {
        console.log(data);
        onSubmitMutation.mutate(data);
      })}
    >
      {isFirstConnection ? (
        <SignupForm form={form} />
      ) : (
        <LoginForm form={form} />
      )}
    </styled.form>
  );
};
const LoginForm = ({
  form,
}: {
  form: UseFormReturn<LoginOrSignupFormProps>;
}) => {
  return (
    <Card.Root mt="-100px" bgColor="background-tertiary">
      <Card.Header>
        <styled.h2 fontWeight="bold">Sign in</styled.h2>
      </Card.Header>
      <Card.Body>
        <Stack w="300px">
          <Flex flexDirection="column">
            <styled.label htmlFor="email">Email</styled.label>
            <Input {...form.register("email")} />
          </Flex>
          <Flex flexDirection="column">
            <styled.label htmlFor="password">Password</styled.label>
            <Input {...form.register("password")} type="password" />
          </Flex>
          <Center>
            <Button type="submit" onClick={() => {}}>
              Sign in
            </Button>
          </Center>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
};

const SignupForm = ({
  form,
}: {
  form: UseFormReturn<LoginOrSignupFormProps>;
}) => {
  const signupMutation = useMutation({
    // mutationFn: async () => authClient.signIn.email({}),
  });

  return (
    <Card.Root mt="-100px" bgColor="background-tertiary">
      <Card.Header>
        <styled.h2 fontWeight="bold">
          This is your first connection, sign up !
        </styled.h2>
      </Card.Header>
      <Card.Body>
        <Stack w="300px">
          <Flex flexDirection="column">
            <styled.label htmlFor="email">Email</styled.label>
            <Input {...form.register("email")} />
          </Flex>
          <Flex flexDirection="column">
            <styled.label htmlFor="password">Password</styled.label>
            <Input {...form.register("password")} type="password" />
          </Flex>
          <Flex flexDirection="column">
            <styled.label htmlFor="token">First connection token</styled.label>
            <Input {...form.register("token")} type="token" />
          </Flex>
          <Center>
            <Button type="submit" onClick={() => {}}>
              Sign up
            </Button>
          </Center>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
};
