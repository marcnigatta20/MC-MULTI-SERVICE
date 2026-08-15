import { AppShell, requireAuth } from "@/lib/auth";
import { ServicesClient } from "@/components/services/services-client";
import { getServices } from "@/services/barber.service";

export default async function ServicesPage() {
  const profile = await requireAuth(["ADMIN"]);
  const services = await getServices(false);

  return (
    <AppShell profile={profile} title="Services" subtitle="Catalogue des prestations">
      <ServicesClient services={services} />
    </AppShell>
  );
}
