import { Metadata } from "next";
import StaffLoginForm from "./_components/StaffLoginForm";

export const metadata: Metadata = {
  title: "Staff Login",
  description: "Staff login page for restaurant dashboard access",
};

export default function StaffLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <StaffLoginForm />
      </div>
    </div>
  );
}
