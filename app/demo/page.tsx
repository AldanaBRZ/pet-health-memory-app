import type { Metadata } from "next";
import { PetHealthDashboard } from "../../components/pet-health-dashboard";

export const metadata: Metadata = {
  title: "Explore the Demo | Pet Health Memory",
  description: "Try a complete temporary pet health household for Milo and Juno without creating an account."
};

export default function DemoPage() {
  return <PetHealthDashboard publicDemo />;
}
