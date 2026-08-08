import { app } from "electron";

class RuntimeInitializer {
  async initialize(): Promise<void> {
    // runtime initialization logic goes here
  }

  shutdown(): void {
    // runtime shutdown logic goes here
  }
}

const runtime = new RuntimeInitializer();

export async function startZaikenRuntime(): Promise<void> {
  await app.whenReady();

  await runtime.initialize();
}

export function stopZaikenRuntime(): void {
  runtime.shutdown();
}