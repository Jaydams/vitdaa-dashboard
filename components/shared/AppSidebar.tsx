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
import {
  ResponsiveSidebar,
  SidebarContentWrapper,
  SidebarSection,
} from "@/components/responsive/ResponsiveSidebar";
import { TouchButton } from "@/components/responsive/TouchOptimizedControls";
import { useResponsive } from "@/components/responsive/ResponsiveDashboardProvider";

export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { isTouchDevice } = useResponsive();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?message=signed-out");
  };

  return (
    <Sidebar className="shadow-md">
      <ResponsiveSidebar>
        <SidebarContentWrapper>
          {/* Logo Section */}
          <SidebarSection>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "font-bold px-6 gap-2 justify-start min-h-fit hover:bg-transparent",
                isTouchDevice ? "text-2xl py-4" : "text-xl py-3"
              )}
            >
              <Typography component="span">VITdaa</Typography>
            </Link>
          </SidebarSection>

          {/* Navigation Section */}
          <SidebarSection className="flex-1">
            <ul
              className={cn(
                "flex flex-col",
                isTouchDevice ? "gap-y-3" : "gap-y-2"
              )}
            >
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
                            "relative w-full justify-start gap-x-2.5 [&_svg]:flex-shrink-0 font-medium focus-visible:bg-accent focus-visible:text-accent-foreground",
                            // Touch-optimized sizing
                            isTouchDevice
                              ? "px-5 py-4 text-base [&_svg]:size-6 min-h-[48px]"
                              : "px-4 py-3 text-sm [&_svg]:size-5 min-h-[40px]",
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
                      <ul
                        className={cn(
                          "ml-6 border-l border-border/50 pl-4",
                          isTouchDevice ? "space-y-2" : "space-y-1"
                        )}
                      >
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
                                "relative w-full justify-start gap-x-2.5 [&_svg]:flex-shrink-0 font-medium focus-visible:bg-accent focus-visible:text-accent-foreground text-muted-foreground hover:text-foreground",
                                // Touch-optimized sizing for submenu
                                isTouchDevice
                                  ? "px-4 py-3 text-sm [&_svg]:size-4 min-h-[44px]"
                                  : "px-3 py-2 text-xs [&_svg]:size-4 min-h-[36px]",
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
                        "relative w-full justify-start gap-x-2.5 [&_svg]:flex-shrink-0 font-medium focus-visible:bg-accent focus-visible:text-accent-foreground",
                        // Touch-optimized sizing
                        isTouchDevice
                          ? "px-5 py-4 text-base [&_svg]:size-6 min-h-[48px]"
                          : "px-4 py-3 text-sm [&_svg]:size-5 min-h-[40px]",
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
          </SidebarSection>

          {/* Logout Section */}
          <SidebarSection className="border-t pt-4">
            <TouchButton
              onClick={handleSignOut}
              className="w-full justify-start gap-3"
              variant="ghost"
            >
              <LogOut
                className={cn(
                  "flex-shrink-0",
                  isTouchDevice ? "size-6" : "size-5"
                )}
              />
              Log out
            </TouchButton>
          </SidebarSection>
        </SidebarContentWrapper>
      </ResponsiveSidebar>
    </Sidebar>
  );
}
