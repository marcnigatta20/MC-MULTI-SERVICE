import { redirect } from "next/navigation";

export default function CashierSalesRedirect() {
  redirect("/transactions/new");
}
