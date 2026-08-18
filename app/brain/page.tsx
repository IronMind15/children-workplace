import { seedIfEmpty } from "@/lib/seed";
import { requireUser } from "@/lib/session";
import { getBrainSettings } from "@/lib/repo";
import { getAiConfig } from "@/lib/ai";
import BrainEditor from "@/components/BrainEditor";

export const dynamic = "force-dynamic";

export default async function BrainPage() {
  await requireUser();
  seedIfEmpty();
  const brain = getBrainSettings();
  const ai = getAiConfig();
  return <BrainEditor initial={brain} ai={{ configured: !!ai, model: ai?.model ?? "deepseek-v4-flash" }} />;
}
