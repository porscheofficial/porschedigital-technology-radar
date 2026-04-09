import { FC, ReactNode } from "react";

import styles from "./Layout.module.scss";

import { Footer } from "@/components/Footer/Footer";
import { Logo } from "@/components/Logo/Logo";
import { Navigation } from "@/components/Navigation/Navigation";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { cn } from "@/lib/utils";

export type LayoutClass = "default" | "full";

interface LayoutProps {
  children: ReactNode;
  layoutClass?: LayoutClass;
}

export const Layout: FC<LayoutProps> = ({
  children,
  layoutClass = "default",
}) => {
  return (
    <div id="layout" className={cn(styles.layout, styles[layoutClass])}>
      <header className={cn(styles.container, styles.header)}>
        <Logo />
        <SearchBar />
        <Navigation />
      </header>
      <main className={cn(styles.content)}>{children}</main>
      <footer className={cn(styles.container, styles.footer)}>
        <Footer />
      </footer>
    </div>
  );
};
