import { MosqueChooser } from "@/components/MosqueChooser";
import { HomeProductShowcase, HomeScrollCue } from "@/components/HomeProductShowcase";

export const dynamic = "force-dynamic";

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <MosqueChooser />
      <HomeScrollCue />
      <HomeProductShowcase currentYear={currentYear} />
    </>
  );
}
