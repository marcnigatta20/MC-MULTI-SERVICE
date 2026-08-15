import { AppShell, requireAuth } from "@/lib/auth";
import { getAuditLogs } from "@/services/barber.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
  SALE_CREATED: "Création transaction",
  SALE_CANCELLED: "Annulation transaction",
  PAYMENT_RECORDED: "Paiement enregistré",
  CASH_OPENED: "Ouverture caisse",
  CASH_CLOSED: "Fermeture caisse",
  EXPENSE_CREATED: "Dépense",
  BARBER_PAYMENT: "Paiement barber",
  USER_CREATED: "Création utilisateur",
  USER_UPDATED: "Modification utilisateur",
  SERVICE_CREATED: "Création service",
  SERVICE_UPDATED: "Modification service",
  COMMISSION_UPDATED: "Modification commission",
  SETTINGS_UPDATED: "Modification paramètres",
};

export default async function AuditPage() {
  const profile = await requireAuth(["ADMIN", "COMPTABLE"]);
  const logs = await getAuditLogs(300);

  return (
    <AppShell profile={profile} title="Journal d'activité" subtitle="Traçabilité de toutes les opérations">
      {logs.length === 0 ? (
        <EmptyState title="Journal vide" description="Aucune activité enregistrée." icon={ClipboardList} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Objet</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const dt = new Date(log.created_at);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(dt)}</TableCell>
                    <TableCell>{dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                    <TableCell>{(log.user as { full_name?: string })?.full_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ACTION_LABELS[log.action] || log.action}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-zinc-400">
                      {log.description || "—"}
                    </TableCell>
                    <TableCell className="text-zinc-500">{log.entity_type || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-600">
                      {log.entity_id ? log.entity_id.slice(0, 8) + "…" : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
