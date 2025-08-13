import Container from "@/components/ui/container";
import Profile from "@/components/shared/header/Profile";
import NavMenuToggle from "./NavMenuToggle";
import ThemeToggle from "@/components/shared/header/ThemeToggle";
import Notifications from "@/components/shared/header/Notifications";
import QRCodeButton from "@/components/shared/header/QRCodeButton";

export default function Header() {
  return (
    <header className="sticky top-0 left-0 w-full bg-popover py-4 shadow-sm z-40">
      <Container>
        <div className="flex justify-between">
          <NavMenuToggle />

          <div className="flex items-center gap-x-2 ml-auto">
            <QRCodeButton />
            <ThemeToggle />
            <Notifications />
            <Profile />
          </div>
        </div>
      </Container>
    </header>
  );
}
