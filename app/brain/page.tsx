import { seedIfEmpty } from "@/lib/seed";
import { getBrainSettings } from "@/lib/repo";
import { getAiConfig } from "@/lib/ai";
import BrainEditor from "@/components/BrainEditor";

export const dynamic = "force-dynamic";

export default function BrainPage() {
  seedIfEmpty();
  const brain = getBrainSettings();
  const ai = getAiConfig();
  return <BrainEditor initial={brain} ai={{ configured: !!ai, model: ai?.model ?? "deepseek-chat" }} />;
}
