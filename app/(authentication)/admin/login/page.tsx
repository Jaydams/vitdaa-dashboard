import { Metadata } from "next";
import AdminLoginForm from "./_components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Admin login to switch back from staff mode",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <AdminLoginForm />
      </div>
    </div>
  );
}
