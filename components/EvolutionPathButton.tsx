"use client";

import { useState } from "react";
import EvolutionModal, { type ChainNode, type ChainEdge } from "@/components/EvolutionModal";

/** 地图上的"进化之路"入口：随时查看谱系进度 */
export default function EvolutionPathButton({ nodes, edges }: { nodes: ChainNode[]; edges: ChainEdge[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="pixel-btn pixel-btn-white px-4 py-2 text-sm">
        🌟 进化之路
      </button>
      <EvolutionModal open={open} nodes={nodes} edges={edges} onClose={() => setOpen(false)} />
    </>
  );
}
