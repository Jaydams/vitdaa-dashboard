import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageTitle from "@/components/shared/PageTitle";
import EditProfileForm from "./_components/EditProfileForm";
import AdminPINSetup from "@/components/admin/AdminPINSetup";
import AdminPINDemo from "@/components/admin/AdminPINDemo";
import isAuth from "@/helpers/isAuth";
import { validateUserProfile } from "@/actions/auth-utils";

export const metadata: Metadata = {
  title: "Edit Profile",
};

export default async function EditProfilePage() {
  // Get current session
  const session = await isAuth();

  if (!session?.user) {
    redirect("/login");
  }

  // Validate user profile
  const profileValidation = await validateUserProfile(session.user.id);

  if (!profileValidation.isBusinessOwner || !profileValidation.businessOwner) {
    redirect("/login");
  }

  const businessOwner = profileValidation.businessOwner;
  const hasAdminPin = !!businessOwner.admin_pin_hash;

  return (
    <section className="space-y-8">
      <PageTitle>Edit Profile</PageTitle>

      <EditProfileForm />

      {!hasAdminPin && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Security Setup</h2>
          <AdminPINSetup
            businessOwnerId={businessOwner.id}
            onSuccess={() => {
              // Refresh the page to update the UI
              window.location.reload();
            }}
          />
        </div>
      )}

      {hasAdminPin && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Admin PIN System</h2>
          <AdminPINDemo businessOwnerId={businessOwner.id} />
        </div>
      )}
    </section>
  );
}
