"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { BsFillHandbagFill } from "react-icons/bs";

import { cn } from "@/lib/utils";
import { navItems } from "@/constants/navItems";
import Typography from "@/components/ui/typography";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { Collapsible } from "@/components/ui/collapsible";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?message=signed-out");
  };

  return (
    <Sidebar className="shadow-md">
      <SidebarContent className="relative">
        <div className="pb-20 h-full">
          <div className="py-6 px-2 flex flex-col overflow-y-auto h-full">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "font-bold text-2xl px-6 gap-2 justify-start min-h-fit hover:bg-transparent"
              )}
            >
              
              <Typography component="span">VITdaa</Typography>
            </Link>

            <ul className="pt-6 flex flex-col gap-y-2">
              {navItems.map((navItem, index) => (
                <li key={`nav-item-${index}`}>
                  {navItem.submenu ? (
                    // Render collapsible menu item with submenu
                    <Collapsible
                      defaultOpen={navItem.submenu.some(
                        (subItem) => pathname === subItem.url
                      )}
                      trigger={
                        <div
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "relative w-full justify-start px-5 py-4 gap-x-2.5 [&_svg]:size-6 [&_svg]:flex-shrink-0 font-medium text-base focus-visible:bg-accent focus-visible:text-accent-foreground",
                            (pathname === navItem.url ||
                              navItem.submenu.some(
                                (subItem) => pathname === subItem.url
                              )) &&
                              "bg-accent text-accent-foreground after:content-[''] after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary after:rounded-r-lg"
                          )}
                        >
                          {navItem.icon} {navItem.title}
                        </div>
                      }
                    >
                      <ul className="ml-6 space-y-1 border-l border-border/50 pl-4">
                        {navItem.submenu.map((subItem, subIndex) => (
                          <li key={`sub-nav-item-${index}-${subIndex}`}>
                            <Link
                              onClick={
                                isMobile
                                  ? () => setOpenMobile(false)
                                  : undefined
                              }
                              href={subItem.url!}
                              className={cn(
                                buttonVariants({ variant: "ghost" }),
                                "relative w-full justify-start px-3 py-2.5 gap-x-2.5 [&_svg]:size-4 [&_svg]:flex-shrink-0 font-medium text-sm focus-visible:bg-accent focus-visible:text-accent-foreground text-muted-foreground hover:text-foreground",
                                pathname === subItem.url &&
                                  "bg-accent text-accent-foreground after:content-[''] after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary after:rounded-r-lg"
                              )}
                            >
                              {subItem.icon} {subItem.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </Collapsible>
                  ) : (
                    // Render regular menu item
                    <Link
                      onClick={
                        isMobile ? () => setOpenMobile(false) : undefined
                      }
                      href={navItem.url!}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "relative w-full justify-start px-5 py-4 gap-x-2.5 [&_svg]:size-6 [&_svg]:flex-shrink-0 font-medium text-base focus-visible:bg-accent focus-visible:text-accent-foreground",
                        pathname === navItem.url &&
                          "bg-accent text-accent-foreground after:content-[''] after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary after:rounded-r-lg"
                      )}
                    >
                      {navItem.icon} {navItem.title}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-4 absolute left-0 w-full right-0 bottom-0 border-t">
            <Button
              onClick={handleSignOut}
              className="w-full py-3 text-base whitespace-nowrap"
            >
              <LogOut className="size-6 mr-3 flex-shrink-0" />
              Log out
            </Button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
