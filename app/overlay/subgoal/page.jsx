import SubgoalOverlay from "@/components/SubgoalOverlay";

export const metadata = {
  title: "Sub-goal overlay - mattothemoon",
  robots: { index: false, follow: false },
};

export default async function SubgoalOverlayPage({ searchParams }) {
  const params = await searchParams;
  const channel = Array.isArray(params.channel) ? params.channel[0] : params.channel;
  return (
    <SubgoalOverlay
      demo={params.demo === "1"}
      test={params.test === "1"}
      channel={channel}
    />
  );
}
