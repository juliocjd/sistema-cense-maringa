import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export default async function InteligenciaPage() {
  const session = await auth().catch(() => null);
  const permissoes = session?.user?.permissions ?? [];

  if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_VIEW)) {
    redirect("/dashboard");
  }

  redirect("/inteligencia/conflitos");
}
