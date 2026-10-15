import { Hero } from '../components/marketing/Hero';
import { VerificationDemo } from '../components/marketing/VerificationDemo';
import { ProblemSection } from '../components/marketing/ProblemSection';
import { CapabilitiesSection } from '../components/marketing/CapabilitiesSection';
import { DashboardPreview } from '../components/marketing/DashboardPreview';
import { HowItWorks } from '../components/marketing/HowItWorks';
import { InvestigatorSection } from '../components/marketing/InvestigatorSection';
import { DeveloperSection } from '../components/marketing/DeveloperSection';
import { SecuritySection } from '../components/marketing/SecuritySection';
import { FinalCta } from '../components/marketing/FinalCta';

/** Public homepage — the full landing page. */
export function HomePage() {
  return (
    <>
      <Hero />
      <VerificationDemo />
      <ProblemSection />
      <CapabilitiesSection />
      <DashboardPreview />
      <HowItWorks />
      <InvestigatorSection />
      <DeveloperSection />
      <SecuritySection />
      <FinalCta />
    </>
  );
}
