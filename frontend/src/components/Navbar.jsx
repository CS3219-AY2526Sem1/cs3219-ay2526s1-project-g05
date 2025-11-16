import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUserContext } from "@/context/UserContext";
import { Menu, User } from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import { buttonVariants } from "./ui/button";
import { NavLink } from "react-router-dom";

const routeList = [
  { href: "/problemset", label: "Problems" },
  { href: "/matchmaking", label: "Match" },
  { href: "/session-history", label: "Sessions" },
];

export const Navbar = () => {
  const { user, logout } = useUserContext();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky border-b-[1px] top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 w-screen flex justify-between ">
          {/* Logo */}
          <NavigationMenuItem className="font-bold flex">
            <NavLink
              rel="noreferrer noopener"
              to="/"
              className="ml-2 font-bold text-xl flex"
            >
              <img src={logo} style={{ height: "55px" }} alt="logo" />
            </NavLink>
          </NavigationMenuItem>

          {/* Mobile */}
          <span className="flex md:hidden">
            <ModeToggle />

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger className="px-2">
                <Menu
                  className="flex md:hidden h-5 w-5"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="sr-only">Menu Icon</span>
                </Menu>
              </SheetTrigger>

              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle className="font-bold text-xl">Menu</SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col justify-center items-center gap-2 mt-4">
                  {routeList.map(({ href, label }) => (
                    <NavLink
                      key={label}
                      to={href}
                      onClick={() => setIsOpen(false)}
                      className={buttonVariants({ variant: "ghost" })}
                    >
                      {label}
                    </NavLink>
                  ))}

                  {user ? (
                    <>
                      <NavLink
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className={buttonVariants({ variant: "ghost" })}
                      >
                        Profile
                      </NavLink>

                      {/* Logout button styled like other menu items */}
                      <button
                        onClick={() => {
                          logout();
                          setIsOpen(false);
                        }}
                        className={buttonVariants({
                          variant: "ghost",
                          className: "text-destructive",
                        })}
                      >
                        Log Out
                      </button>
                    </>
                  ) : (
                    <NavLink
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className={buttonVariants({ variant: "ghost" })}
                    >
                      Log In
                    </NavLink>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </span>

          {/* Desktop */}
          <nav className="hidden md:flex gap-2">
            {routeList.map(({ href, label }, i) => (
              <NavLink
                rel="noreferrer noopener"
                to={href}
                key={i}
                className={`text-[17px] ${buttonVariants({
                  variant: "ghost",
                })}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex gap-2 items-center">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`border ${buttonVariants({
                    variant: "secondary",
                  })}`}
                >
                  <User className="mr-2 h-4 w-4 inline" />
                  Hi, {user.username || "User"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <NavLink to="/profile">Profile</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/session-history">Past Sessions</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive cursor-pointer"
                  >
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <NavLink
                rel="noreferrer noopener"
                to="/login"
                className={`border ${buttonVariants({ variant: "secondary" })}`}
              >
                Log In
              </NavLink>
            )}

            <ModeToggle />
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};
