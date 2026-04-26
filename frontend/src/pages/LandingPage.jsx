import DatasetSection from "../components/DatasetSection";
import DeploymentSection from "../components/DeploymentSection";
import Footer from "../components/Footer";
import HeroSection from "../components/HeroSection";
import TrainingSection from "../components/TrainingSection";
import WorkspaceSection from "../components/WorkspaceSection";

function StoryStrip({ chapter, title, copy, index }) {
  return (
    <section className="px-6 md:px-12 lg:px-16 py-10 md:py-14 border-y border-white/5 bg-[#09090D]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div
          className={`lg:col-span-3 ${index % 2 === 0 ? "lg:order-1" : "lg:order-2"}`}
        >
          <p className="font-mono text-[11px] tracking-[0.34em] uppercase text-cyan/70">
            {chapter}
          </p>
          <div className="mt-3 h-px w-28 bg-gradient-to-r from-cyan/50 to-transparent" />
        </div>
        <div
          className={`lg:col-span-9 ${index % 2 === 0 ? "lg:order-2" : "lg:order-1"}`}
        >
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-white leading-[0.95] tracking-tight">
            {title}
          </h2>
          <p className="mt-4 font-mono text-sm md:text-base text-dim max-w-3xl leading-relaxed">
            {copy}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const chapters = [
    {
      chapter: "ACT I / SIGNAL",
      title: "Frame the model idea before you write a single line.",
      copy: "Shape architecture visually, surface layer intent, and align the team around structure first. This is the drafting table, not the terminal.",
    },
    {
      chapter: "ACT II / DATA",
      title: "Treat data as editorial material, not raw fuel.",
      copy: "Audit sources, compare profiles, and build confidence in what enters training. Better inputs create cleaner model behavior and faster iteration.",
    },
    {
      chapter: "ACT III / INTELLIGENCE",
      title: "Read training as a narrative of learning velocity.",
      copy: "Track convergence, decode confidence, and identify drift signals early. NeuralNet makes model learning legible, not mysterious.",
    },
    {
      chapter: "ACT IV / RELEASE",
      title: "Publish endpoints with a product-grade handoff.",
      copy: "Move from builder to live API in minutes, then hand your team verified snippets and keys so integration can happen immediately.",
    },
  ];

  return (
    <main className="bg-[#07070B] text-[#E6E7EF]">
      <HeroSection />
      <StoryStrip {...chapters[0]} index={0} />
      <WorkspaceSection />

      <StoryStrip {...chapters[1]} index={1} />
      <DatasetSection />

      <StoryStrip {...chapters[2]} index={2} />
      <TrainingSection />

      <StoryStrip {...chapters[3]} index={3} />
      <DeploymentSection />
      <Footer />
    </main>
  );
}
