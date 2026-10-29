export type Args = Readonly<Record<string, string>>;
export type Turn =
  | Readonly<{ kind: 'load_skill'; name: string }>
  | Readonly<{ kind: 'call'; tool: string; args: Args }>
  | Readonly<{ kind: 'answer'; text: string }>;
export type Event = Readonly<{
  step: number;
  type: 'proposal' | 'skill_loaded' | 'blocked' | 'result' | 'answer' | 'stopped' | 'error';
  detail: string;
}>;
export type Tool = Readonly<{
  permission: 'allow' | 'ask' | 'deny';
  run: (args: Args) => string | Promise<string>;
}>;
export type Model = (events: readonly Event[]) => string | Promise<string>;
export type Outcome = Readonly<{
  status: 'answered' | 'blocked' | 'needs_approval' | 'exhausted' | 'error';
  events: readonly Event[];
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Read model output as data. Model-supplied extra fields cannot grant authority.
export function parseTurn(raw: string): Turn {
  const v: unknown = JSON.parse(raw);
  if (!record(v)) throw new Error('Invalid turn');
  if (v.kind === 'answer' && typeof v.text === 'string') {
    return Object.freeze({ kind: 'answer', text: v.text });
  }
  if (v.kind === 'load_skill' && typeof v.name === 'string') {
    return Object.freeze({ kind: 'load_skill', name: v.name });
  }
  if (v.kind === 'call' && typeof v.tool === 'string' && record(v.args)
    && Object.values(v.args).every(x => typeof x === 'string')) {
    return Object.freeze({ kind: 'call', tool: v.tool, args: Object.freeze({ ...v.args }) as Args });
  }
  throw new Error('Invalid turn');
}

export async function runHarness(options: {
  model: Model;
  tools: ReadonlyMap<string, Tool>;
  skills: ReadonlyMap<string, readonly string[]>;
  maxSteps: number;
}): Promise<Outcome> {
  const { model, tools, skills, maxSteps } = options;
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 0) throw new Error('Invalid step budget');
  const visible = new Set<string>();
  const log: Event[] = [];
  const emit = (step: number, type: Event['type'], detail: string) => {
    log.push(Object.freeze({ step, type, detail }));
  };
  const finish = (status: Outcome['status']): Outcome => Object.freeze({
    status, events: Object.freeze(log.slice()),
  });

  for (let step = 1; step <= maxSteps; step++) {
    let turn: Turn;
    try {
      turn = parseTurn(await model(Object.freeze(log.slice())));
    } catch {
      emit(step, 'error', 'Model request failed or returned an invalid turn');
      return finish('error');
    }
    emit(step, 'proposal', JSON.stringify(turn));
    if (turn.kind === 'answer') {
      emit(step, 'answer', turn.text);
      return finish('answered');
    }
    if (turn.kind === 'load_skill') {
      const names = skills.get(turn.name);
      if (!names) {
        emit(step, 'blocked', 'Unknown skill');
        return finish('blocked');
      }
      names.forEach(name => visible.add(name));
      emit(step, 'skill_loaded', turn.name);
      continue;
    }

    const tool = tools.get(turn.tool);
    if (!tool || !visible.has(turn.tool)) {
      emit(step, 'blocked', 'Tool is unknown or not visible');
      return finish('blocked');
    }
    if (tool.permission === 'ask') {
      emit(step, 'blocked', 'Human approval required; this example stops here');
      return finish('needs_approval');
    }
    if (tool.permission !== 'allow') {
      emit(step, 'blocked', 'Tool denied by host policy');
      return finish('blocked');
    }
    try {
      emit(step, 'result', await tool.run(turn.args));
    } catch {
      emit(step, 'error', 'Tool failed; no retry attempted');
      return finish('error');
    }
  }
  emit(maxSteps, 'stopped', 'Step budget exhausted');
  return finish('exhausted');
}
