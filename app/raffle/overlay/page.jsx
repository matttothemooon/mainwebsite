import "./overlay.css";
import RaffleOverlay from "@/components/tools/RaffleOverlay";

export const metadata = { title: "Raffle overlay", robots: { index: false } };

export default async function OverlayPage({ searchParams }) {
  const q = await searchParams;
  return <RaffleOverlay channel={String(q.channel || "")} by={String(q.by || "")} />;
}
