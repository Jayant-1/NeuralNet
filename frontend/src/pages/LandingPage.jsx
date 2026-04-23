import HeroSection from '../components/HeroSection';
import WorkspaceSection from '../components/WorkspaceSection';
import DatasetSection from '../components/DatasetSection';
import TrainingSection from '../components/TrainingSection';
import DeploymentSection from '../components/DeploymentSection';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <WorkspaceSection />
      <DatasetSection />
      <TrainingSection />
      <DeploymentSection />
      <Footer />
    </>
  );
}
