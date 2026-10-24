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
    return { variant: v.id, posteriorMean: (wins + 1) / (n + 2), interval: betaInterval(wins + 1, n - wins + 1), n, wins };
  });
  const ready = scored.every(s => s.n >= 100) && scored.reduce((sum,s) => sum+s.wins,0) >= 20;
  const sorted = [...scored].sort((a,b) => b.posteriorMean-a.posteriorMean);
  return { scores: scored, ready, candidate: ready && sorted[0].posteriorMean !== sorted[1].posteriorMean ? sorted[0].variant : null,
    note: ready ? "Enough observations for a review, not proof of a winner. Check uncertainty and campaign mix before changing allocation." : "Learning is collecting evidence. Review gate: 100 mature viewed sessions per variant and 20 converted sessions overall. This gate does not establish statistical significance." };
}
export function chooseVariant(random = Math.random()) {
  return random < 0.5 ? "control" : "protein";
}

// Regularized incomplete beta via a continued fraction, inverted for equal-tail
// Bayesian intervals. Uniform Beta(1,1) prior; no significance claim.
function logGamma(z: number): number {
  const c = [676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  z -= 1; let x = 0.9999999999998099;
  c.forEach((v,i) => { x += v/(z+i+1); });
  const t=z+7.5; return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
function betaFraction(a:number,b:number,x:number) {
  const floor=(v:number)=>Math.abs(v)<1e-30?1e-30:v;
  let c=1,d=1/floor(1-(a+b)*x/(a+1)),h=d;
  for(let m=1;m<=300;m++) {
    let aa=m*(b-m)*x/((a+2*m-1)*(a+2*m));
    d=1/floor(1+aa*d);c=floor(1+aa/c);h*=d*c;
    aa=-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1));
    d=1/floor(1+aa*d);c=floor(1+aa/c);const delta=d*c;h*=delta;
    if(Math.abs(delta-1)<1e-12)break;
  }
  return h;
}
function betaCDF(x:number,a:number,b:number):number {
  if(x<=0)return 0;if(x>=1)return 1;
  const term=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));
  return x<(a+1)/(a+b+2)?term*betaFraction(a,b,x)/a:1-term*betaFraction(b,a,1-x)/b;
}
export function betaInterval(a:number,b:number):[number,number] {
  const quantile=(p:number)=>{let lo=0,hi=1;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(betaCDF(mid,a,b)<p)lo=mid;else hi=mid;}return (lo+hi)/2;};
  return [quantile(.025),quantile(.975)];
}
export function estimateDuration(visitsPerDay:number,optInPercent:number,conversionPercent:number) {
  if(![visitsPerDay,optInPercent,conversionPercent].every(Number.isFinite)||visitsPerDay<=0||optInPercent<=0||optInPercent>100||conversionPercent<=0||conversionPercent>100)return null;
  const eligiblePerDay=visitsPerDay*optInPercent/100;
  const requiredViews=Math.max(200,20/(conversionPercent/100));
  return {eligiblePerDay,requiredViews:Math.ceil(requiredViews),days:Math.ceil(requiredViews/eligiblePerDay)+experiment.windowDays};
}
