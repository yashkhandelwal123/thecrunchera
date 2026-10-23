import { edamame } from "./edamame";
export const experiment = {
  id: "edamame-message-v1",
  name: "Edamame: taste or protein?",
  page: "/edamame-beans",
  windowDays: 7,
  variants: [
    { id: "control", label: "Control · existing description", message: edamame.description },
    { id: "protein", label: "Plant-protein message", message: "46.3 g of plant protein per 100 g, with a roasted crunch and Classic Salt seasoning. Made with edamame beans, rice bran oil and salt. Enjoy straight from the jar or add a little crunch to your favourite bowl." },
  ],
} as const;
export interface ArmStats { variant: string; assigned: number; viewed: number; matured: number; converted: number; revenue: number }
// Beta(1,1) posterior mean: a shadow learning recommendation, not a confidence
// statement or an instruction to send traffic. Equal random allocation stays fixed.
export function learningSummary(rows: ArmStats[]) {
  const scored = experiment.variants.map(v => {
    const row = rows.find(r => r.variant === v.id);
    const n = row?.matured || 0, wins = row?.converted || 0;
    return { variant: v.id, posteriorMean: (wins + 1) / (n + 2), n, wins };
  });
  const ready = scored.every(s => s.n >= 100) && scored.reduce((sum,s) => sum+s.wins,0) >= 20;
  const sorted = [...scored].sort((a,b) => b.posteriorMean-a.posteriorMean);
  return { scores: scored, ready, candidate: ready && sorted[0].posteriorMean !== sorted[1].posteriorMean ? sorted[0].variant : null,
    note: ready ? "Enough observations for a review, not proof of a winner. Check uncertainty and campaign mix before changing allocation." : "Learning is collecting evidence. Review gate: 100 mature viewed sessions per variant and 20 converted sessions overall. This gate does not establish statistical significance." };
}
export function chooseVariant(random = Math.random()) {
  return random < 0.5 ? "control" : "protein";
}
