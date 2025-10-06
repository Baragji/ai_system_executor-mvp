import type { TaskPlan, DependencyAnalysis } from "./types.js";

function buildGraph(plan: TaskPlan): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  plan.subtasks.forEach(subtask => {
    graph.set(subtask.id, [...(subtask.dependencies ?? [])]);
  });
  return graph;
}

function detectCycles(graph: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (stack.has(node)) {
      const startIndex = path.indexOf(node);
      const cycle = path.slice(startIndex);
      cycle.push(node);
      cycles.push(cycle);
      return;
    }
    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    stack.add(node);
    const neighbors = graph.get(node) ?? [];
    neighbors.forEach(dep => dfs(dep, [...path, node]));
    stack.delete(node);
  }

  graph.forEach((_, node) => {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  });

  return cycles;
}

function topologicalSort(plan: TaskPlan, graph: Map<string, string[]>): string[] | null {
  const inDegree = new Map<string, number>();
  plan.subtasks.forEach(subtask => {
    inDegree.set(subtask.id, 0);
  });

  graph.forEach((dependencies, node) => {
    dependencies.forEach(() => {
      inDegree.set(node, (inDegree.get(node) ?? 0) + 1);
    });
  });

  const queue: string[] = [];
  inDegree.forEach((degree, node) => {
    if (degree === 0) {
      queue.push(node);
    }
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    const dependents = plan.subtasks.filter(subtask => (subtask.dependencies ?? []).includes(node));
    dependents.forEach(subtask => {
      const id = subtask.id;
      const degree = (inDegree.get(id) ?? 0) - 1;
      inDegree.set(id, degree);
      if (degree === 0) {
        queue.push(id);
      }
    });
  }

  if (order.length !== plan.subtasks.length) {
    return null;
  }

  return order;
}

function computeLevels(order: string[], graph: Map<string, string[]>): Map<string, number> {
  const levels = new Map<string, number>();

  order.forEach(node => {
    const dependencies = graph.get(node) ?? [];
    if (dependencies.length === 0) {
      levels.set(node, 0);
    } else {
      const level = Math.max(
        ...dependencies.map(dep => (levels.get(dep) ?? 0) + 1)
      );
      levels.set(node, level);
    }
  });

  return levels;
}

function computeCriticalPath(
  order: string[],
  plan: TaskPlan,
  graph: Map<string, string[]>
): string[] {
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();

  order.forEach(node => {
    const dependencies = graph.get(node) ?? [];
    if (dependencies.length === 0) {
      distances.set(node, 1);
      predecessors.set(node, null);
    } else {
      let maxDistance = 0;
      let predecessor: string | null = null;
      dependencies.forEach(dep => {
        const distance = (distances.get(dep) ?? 0) + 1;
        if (distance > maxDistance) {
          maxDistance = distance;
          predecessor = dep;
        }
      });
      distances.set(node, maxDistance);
      predecessors.set(node, predecessor);
    }
  });

  let longestNode: string | null = null;
  let longestDistance = 0;
  distances.forEach((distance, node) => {
    if (distance > longestDistance) {
      longestDistance = distance;
      longestNode = node;
    }
  });

  if (!longestNode) {
    return [];
  }

  const path: string[] = [];
  let current: string | null = longestNode;
  while (current) {
    path.unshift(current);
    current = predecessors.get(current) ?? null;
  }

  return path;
}

function computeParallelizable(levels: Map<string, number>): string[][] {
  const groups = new Map<number, string[]>();
  levels.forEach((level, node) => {
    const group = groups.get(level) ?? [];
    group.push(node);
    groups.set(level, group);
  });

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, nodes]) => nodes)
    .filter(nodes => nodes.length > 0);
}

export function analyzeDependencies(plan: TaskPlan): DependencyAnalysis {
  const graph = buildGraph(plan);
  const cycles = detectCycles(graph);
  const isAcyclic = cycles.length === 0;

  if (!isAcyclic) {
    return {
      isAcyclic: false,
      cycles,
      executionOrder: [],
      parallelizable: [],
      criticalPath: []
    };
  }

  const order = topologicalSort(plan, graph);
  if (!order) {
    return {
      isAcyclic: false,
      cycles,
      executionOrder: [],
      parallelizable: [],
      criticalPath: []
    };
  }

  const levels = computeLevels(order, graph);
  const parallelizable = computeParallelizable(levels);
  const criticalPath = computeCriticalPath(order, plan, graph);

  return {
    isAcyclic: true,
    cycles: [],
    executionOrder: order,
    parallelizable,
    criticalPath
  };
}
