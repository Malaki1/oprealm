type EventContext<Env = unknown, Params extends string = string, Data = unknown> = {
  request: Request;
  env: Env;
  params: Record<Params, string>;
  data: Data;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
};

type PagesFunction<Env = unknown, Params extends string = string, Data = unknown> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;
