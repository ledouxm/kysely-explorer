import {
  createEndpoint,
  Endpoint,
  EndpointContext,
  EndpointOptions,
  Middleware,
} from "better-call";
import { Context, Next } from "hono";
import { GlobalHonoConfig } from "../auth";

export const loggedInMiddleware = async (
  c: Context<GlobalHonoConfig>,
  next: Next,
) => {
  const user = c.get("user");
  console.log("request", c.req.method, c.req.url);
  if (!user) {
    return new Response("Not allowed", {
      status: 403,
      statusText: "NOT_ALLOWED",
    });
  }
  return next();
};

export const createIntermediateRouter = <
  E extends Record<string, Endpoint>,
  Middlewares extends Middleware,
  Path extends string = "",
>(
  endpoints: E,
  path?: Path,
) => {
  const newEndpoints: any = {};
  for (const key in endpoints) {
    const endpoint = endpoints[key];
    const newPath = `${path ?? ""}${endpoint.path}`;

    endpoint.path = newPath;
    newEndpoints[key] = endpoint;
  }

  return newEndpoints as any as {
    [K in keyof E]: E[K] extends Endpoint<infer P, infer Options, infer R>
      ? Endpoint<
          `${Path}${P}`,
          Options & { use: Middlewares[] },
          (context: EndpointContext<Path, Options>) => Promise<R>
        >
      : never;
  };
};

export const createEndpointWithContext =
  <Middlewares extends Middleware[]>(middlewares: Middlewares) =>
  <Path extends string, Options extends EndpointOptions, R>(
    path: Path,
    options: Options,
    handler: (
      context: EndpointContext<Path, ReplaceUse<Options, Middlewares>>,
    ) => Promise<R>,
  ) => {
    const use = [...middlewares, ...(options.use ?? [])];

    return createEndpoint(
      path,
      { ...options, use } as any,
      handler,
    ) as any as EnhanceEndpoint<
      Middlewares,
      Endpoint<
        Path,
        Options,
        (
          context: EndpointContext<Path, ReplaceUse<Options, Middlewares>>,
        ) => Promise<R>
      >
    >;
  };

type EnhanceEndpoint<Middlewares extends Middleware[], E extends Endpoint> =
  E extends Endpoint<infer Path, infer Options, infer Handler>
    ? Endpoint<Path, ReplaceUse<Options, Middlewares>, Handler>
    : never;

type ReplaceUse<
  Options extends EndpointOptions,
  Middlewares extends Middleware[],
> = Omit<Options, "use"> & {
  use: Options["use"] extends Middleware[]
    ? [...Middlewares, ...Options["use"]]
    : Middlewares;
};

export const createMiddlewareContext = <
  Middlewares extends Middleware[],
  ParentMiddlewares extends Middleware[] = [],
>(
  middlewares: Middlewares,
  parentMiddlewares = [] as any as ParentMiddlewares,
) => {
  const createEndpoint = createEndpointWithContext<
    [...ParentMiddlewares, ...Middlewares]
  >([...(parentMiddlewares ?? []), ...middlewares]);

  const _middlewares = middlewares;

  const createChildrenMiddlewareContext = <
    ChildrenMiddlewares extends Middleware[],
  >(
    middlewares: ChildrenMiddlewares,
  ) => {
    return createMiddlewareContext<ChildrenMiddlewares, Middlewares>(
      middlewares,
      _middlewares,
    );
  };

  return {
    createEndpoint,
    createMiddlewareContext: createChildrenMiddlewareContext,
    middlewares,
  };
};
