import { redirect } from "next/navigation";
import { approveFinanceTransaction } from "@/app/actions";

export async function POST(request) {
  const formData = await request.formData();
  const result = await approveFinanceTransaction(null, formData);

  if (result?.success === false) {
    redirect(`/finance?error=${encodeURIComponent(result.message || "Approval failed.")}`);
  }

  if (result?.data?.posted) {
    redirect("/finance?notice=Transaction+approved+and+posted+to+ledger.");
  }

  redirect("/finance?notice=Approval+recorded.+Awaiting+additional+signatures.");
}
