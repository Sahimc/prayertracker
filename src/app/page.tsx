import { MosqueChooser } from "@/components/MosqueChooser";
import { HomeProductShowcase } from "@/components/HomeProductShowcase";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <MosqueChooser />
      <HomeProductShowcase />
    </>
  );
}
