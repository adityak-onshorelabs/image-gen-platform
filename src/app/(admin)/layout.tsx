import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await getSession();
  if (!email) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar email={email} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
