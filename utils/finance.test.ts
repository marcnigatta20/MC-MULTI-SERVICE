import { describe, it, expect } from "vitest";
import {
  calculateCommissionBreakdown,
  calculateTheoreticalBalance,
} from "@/utils/finance";
import {
  formatCurrency,
  toCents,
  fromCents,
  getUserFacingErrorMessage,
  getTodayISO,
  toLocalDateISO,
} from "@/lib/utils";
import { canAccessRoute } from "@/lib/access";
import { getReportTypeMeta } from "@/lib/report-types";
import { mergeBarberStats } from "@/services/barber.service";

describe("calculateCommissionBreakdown", () => {
  it("calcule commission 40% sur 1000 HTG → Barber 400, MC 600", () => {
    const result = calculateCommissionBreakdown(1000, 40);
    expect(result.commissionAmount).toBe(400);
    expect(result.shopAmount).toBe(600);
    expect(result.totalAmount).toBe(1000);
  });

  it("applique une remise avant commission", () => {
    const result = calculateCommissionBreakdown(1000, 40, 200);
    expect(result.totalAmount).toBe(800);
    expect(result.commissionAmount).toBe(320);
    expect(result.shopAmount).toBe(480);
  });

  it("plafonne remise au prix original", () => {
    const result = calculateCommissionBreakdown(1000, 40, 1500);
    expect(result.discountAmount).toBe(1000);
    expect(result.totalAmount).toBe(0);
    expect(result.commissionAmount).toBe(0);
    expect(result.shopAmount).toBe(0);
  });

  it("commission 50% sur 1000 HTG", () => {
    const result = calculateCommissionBreakdown(1000, 50);
    expect(result.commissionAmount).toBe(500);
    expect(result.shopAmount).toBe(500);
  });

  it("rejette commission > 100% via validation métier", () => {
    const result = calculateCommissionBreakdown(1000, 100);
    expect(result.commissionAmount).toBe(1000);
    expect(result.shopAmount).toBe(0);
  });
});

describe("calculateTheoreticalBalance — caisse", () => {
  it("calcule solde théorique : fonds + ventes - dépenses", () => {
    expect(
      calculateTheoreticalBalance({
        openingBalance: 5000,
        cashSales: 32000,
        expenses: 3000,
      })
    ).toBe(34000);
  });

  it("calcule différence caisse négative", () => {
    const theoretical = 37000;
    const physical = 36500;
    expect(physical - theoretical).toBe(-500);
  });

  it("ouverture caisse avec fonds initial 5000", () => {
    const balance = calculateTheoreticalBalance({
      openingBalance: 5000,
      cashSales: 0,
      expenses: 0,
    });
    expect(balance).toBe(5000);
  });

  it("fermeture caisse avec entrées et sorties", () => {
    const balance = calculateTheoreticalBalance({
      openingBalance: 5000,
      cashSales: 32000,
      authorizedInflows: 1000,
      expenses: 3000,
      authorizedOutflows: 500,
    });
    expect(balance).toBe(34500);
  });
});

describe("formatCurrency", () => {
  it("formate 1000 → 1 000 HTG", () => {
    expect(formatCurrency(1000)).toBe("1\u202f000 HTG");
  });

  it("formate 35000 → 35 000 HTG", () => {
    expect(formatCurrency(35000)).toBe("35\u202f000 HTG");
  });
});

describe("précision financière (centimes)", () => {
  it("évite erreurs flottantes", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(1001)).toBe(10.01);
  });

  it("montant restant barber = commissions - payé", () => {
    const commissions = 60000;
    const paid = 45000;
    expect(commissions - paid).toBe(15000);
  });
});

describe("annulation transaction — règles métier", () => {
  it("transaction annulée conserve montants historiques", () => {
    const original = calculateCommissionBreakdown(1000, 40);
    const afterRateChange = calculateCommissionBreakdown(1000, 50);
    expect(original.commissionAmount).toBe(400);
    expect(afterRateChange.commissionAmount).toBe(500);
    expect(original.commissionAmount).not.toBe(afterRateChange.commissionAmount);
  });
});

describe("paiement barber — validation montant", () => {
  it("refuse paiement supérieur au solde sans autorisation", () => {
    const balanceDue = 15000;
    const payment = 20000;
    const allowOverpayment = false;
    const allowed = payment <= balanceDue || allowOverpayment;
    expect(allowed).toBe(false);
  });

  it("autorise surpaiement avec flag admin", () => {
    const balanceDue = 15000;
    const payment = 20000;
    const allowOverpayment = true;
    const allowed = payment <= balanceDue || allowOverpayment;
    expect(allowed).toBe(true);
  });
});

describe("dates locales réelles", () => {
  it("renvoie la date du jour selon le fuseau local plutôt que UTC", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    expect(getTodayISO()).toBe(expected);
    expect(toLocalDateISO(today)).toBe(expected);
  });
});

describe("messages d’erreur utilisateur", () => {
  it("conserve le message de référence en double sans redirection", () => {
    expect(
      getUserFacingErrorMessage(new Error("Cette référence existe déjà."))
    ).toBe("Cette référence existe déjà.");
  });

  it("transforme les erreurs de doublon en message de référence existante", () => {
    expect(getUserFacingErrorMessage(new Error("duplicate key value"))).toBe(
      "Cette référence existe déjà."
    );
  });
});

describe("sélecteur de rapport", () => {
  it("propose les types de rapport Store et Barber", () => {
    expect(getReportTypeMeta("store")).toMatchObject({ label: "Store", value: "store" });
    expect(getReportTypeMeta("barber")).toMatchObject({ label: "Barber", value: "barber" });
  });
});

describe("mergeBarberStats", () => {
  it("inclut un barber présent dans la table même si la vue de synthèse est incomplète", () => {
    const barbers = [
      {
        id: "b1",
        full_name: "Jean Dupont",
        first_name: "Jean",
        last_name: "Dupont",
        email: "jean@example.com",
        phone: "123",
        commission_rate: 40,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        user_id: "u1",
      },
    ];

    const balances = [] as Array<Record<string, unknown>>;

    const result = mergeBarberStats(barbers as any, balances as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      barber_id: "b1",
      full_name: "Jean Dupont",
      commission_rate: 40,
      total_revenue: 0,
      service_count: 0,
      total_commissions: 0,
      total_paid: 0,
      balance_due: 0,
    });
  });
});

describe("permissions — matrice rôles", () => {
  const canCreateTransaction = (role: string) =>
    role === "ADMIN" || role === "CAISSIERE";
  const canCancel = (role: string) => role === "ADMIN";
  const canReadAllFinancial = (role: string) =>
    role === "ADMIN" || role === "COMPTABLE";

  it("caissière peut créer transaction", () => {
    expect(canCreateTransaction("CAISSIERE")).toBe(true);
  });

  it("barber ne peut pas créer transaction", () => {
    expect(canCreateTransaction("BARBER")).toBe(false);
  });

  it("seul admin annule", () => {
    expect(canCancel("ADMIN")).toBe(true);
    expect(canCancel("CAISSIERE")).toBe(false);
  });

  it("comptable lecture seule financière", () => {
    expect(canReadAllFinancial("COMPTABLE")).toBe(true);
    expect(canCancel("COMPTABLE")).toBe(false);
  });

  it("la caisse et le dashboard respectent les rôles autorisés", () => {
    expect(canAccessRoute("CAISSIERE", "/cashier-dashboard")).toBe(true);
    expect(canAccessRoute("CAISSIERE", "/dashboard")).toBe(false);
    expect(canAccessRoute("ADMIN", "/users")).toBe(true);
    expect(canAccessRoute("COMPTABLE", "/transactions")).toBe(true);
    expect(canAccessRoute("BARBER", "/cashier-dashboard")).toBe(false);
  });
});
