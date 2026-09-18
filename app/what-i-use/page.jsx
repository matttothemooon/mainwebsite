import { getProfile } from "@/lib/storage";
import GearGuide from "@/components/GearGuide";

export const metadata = {
  title: "What I Use · mattothemoon",
  description: "The hardware and setup I use for gaming, streaming, and work.",
};

export default async function WhatIUsePage() {
  const profile = await getProfile();
  return (
    <div className="terminal terminal--wide">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content">
        <p className="page-back"><a href="/">← back</a></p>
        <h1>What I Use</h1>
        <GearGuide gear={profile.gear} />
      </main>
    </div>
  );
}
