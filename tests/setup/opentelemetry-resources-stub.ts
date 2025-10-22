class Resource {
  merge(): Resource {
    return this;
  }
}

export function defaultResource(): Resource {
  return new Resource();
}

export function resourceFromAttributes(_attributes: Record<string, unknown>): Resource {
  return new Resource();
}
