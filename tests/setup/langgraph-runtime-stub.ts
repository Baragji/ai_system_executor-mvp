export class StateGraph<TState> {
  private readonly nodes: Array<(state: TState) => Promise<TState> | TState> = [];

  constructor(_config: unknown) {}

  addNode(_name: string, handler: (state: TState) => Promise<TState> | TState): void {
    this.nodes.push(handler);
  }

  addEdge(_from: unknown, _to: unknown): void {
    // edges are ignored in stub; nodes execute in insertion order
  }

  compile() {
    const handlers = [...this.nodes];
    return {
      async invoke(initial: TState): Promise<TState> {
        let state = initial;
        for (const handler of handlers) {
          state = await handler(state);
        }
        return state;
      },
    };
  }
}

export const START = Symbol.for("langgraph.start");
export const END = Symbol.for("langgraph.end");
