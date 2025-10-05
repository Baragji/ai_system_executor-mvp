import { chooseProvider } from "./providers/choose.js";

export type LLMMessage = { role: "system" | "user"; content: string };

export async function generateJSON(messages: LLMMessage[]): Promise<string> {
  const provider = chooseProvider();
  return provider.generate(messages);
}
